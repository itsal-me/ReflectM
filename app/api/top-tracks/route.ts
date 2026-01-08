import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSpotifyApi } from '@/lib/spotify/client'
import { getSpotifyTokens, refreshSpotifyToken, saveSpotifyTokens, clearSpotifyTokens } from '@/lib/spotify/auth'
import { getLatestVibeAnalysis, saveVibeAnalysis } from '@/lib/db/vibe'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('Top tracks: No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching top tracks for user:', user.id)
    
    // Check if we should force refresh (query param)
    const searchParams = request.nextUrl.searchParams
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    // If not forcing refresh, check for existing analysis (less than 24 hours old)
    if (!forceRefresh) {
      const existingAnalysis = await getLatestVibeAnalysis(user.id)
      if (existingAnalysis) {
        const analyzedAt = new Date(existingAnalysis.analyzed_at)
        const hoursSinceAnalysis = (Date.now() - analyzedAt.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceAnalysis < 24) {
          console.log('Returning cached vibe analysis from', hoursSinceAnalysis.toFixed(1), 'hours ago')
          return NextResponse.json({
            tracks: existingAnalysis.tracks,
            personality: {
              type: existingAnalysis.personality_type,
              traits: existingAnalysis.personality_traits,
              description: existingAnalysis.personality_description,
            },
            metrics: {
              valence: existingAnalysis.valence,
              energy: existingAnalysis.energy,
              danceability: existingAnalysis.danceability,
              acousticness: existingAnalysis.acousticness,
              instrumentalness: existingAnalysis.instrumentalness,
            },
            cached: true,
            analyzed_at: existingAnalysis.analyzed_at,
          })
        }
      }
    }
    
    console.log('Performing fresh analysis...')

    // Get Spotify tokens
    const tokens = await getSpotifyTokens(user.id)
    console.log('Tokens found:', !!tokens)
    
    if (!tokens) {
      console.error('No Spotify tokens in database for user:', user.id)
      return NextResponse.json(
        { error: 'Spotify not connected. Please connect your Spotify account.' },
        { status: 401 }
      )
    }
    
    console.log('Token details:', {
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      isExpired: tokens.expiresAt ? new Date(tokens.expiresAt) < new Date() : 'unknown'
    })
    
    let accessToken = tokens?.accessToken

    // Refresh token if expired
    if (tokens && tokens.expiresAt && new Date(tokens.expiresAt) < new Date()) {
      console.log('Token expired, refreshing...')
      if (tokens.refreshToken) {
        const refreshed = await refreshSpotifyToken(tokens.refreshToken)
        accessToken = refreshed.accessToken
        await saveSpotifyTokens(
          user.id,
          refreshed.accessToken,
          tokens.refreshToken,
          refreshed.expiresIn
        )
        console.log('Token refreshed successfully')
      }
    }

    if (!accessToken) {
      console.error('No access token available')
      return NextResponse.json({ error: 'No Spotify token' }, { status: 401 })
    }

    console.log('Creating Spotify API client')
    const spotifyApi = createSpotifyApi(accessToken)
    
    // Test the token by fetching current user (quick validation)
    console.log('Validating Spotify token...')
    try {
      const me = await spotifyApi.getMe()
      console.log('✅ Token valid, user:', me.body.display_name || me.body.id)
      console.log('✅ User profile data:', {
        id: me.body.id,
        display_name: me.body.display_name,
        email: me.body.email,
        country: me.body.country,
        product: me.body.product
      })
    } catch (tokenError: any) {
      console.error('Invalid Spotify token:', tokenError)
      console.error('Token validation error details:', {
        message: tokenError?.message,
        statusCode: tokenError?.statusCode,
        body: tokenError?.body
      })
      return NextResponse.json(
        { error: 'Spotify token is invalid or expired. Please reconnect your Spotify account.' },
        { status: 401 }
      )
    }
    
    // Fetch top tracks from last 1 month (short_term)
    console.log('Fetching top tracks...')
    console.log('Access token (first 20 chars):', accessToken.substring(0, 20) + '...')

    const fetchTopTracks = async (tokenToUse: string) => {
      const api = createSpotifyApi(tokenToUse)
      if (tokenToUse !== accessToken) {
        console.log('Retrying top tracks with refreshed token')
      }
      return api.getMyTopTracks({
        limit: 50,
        time_range: 'short_term', // last 4 weeks
      })
    }

    let topTracks
    try {
      topTracks = await fetchTopTracks(accessToken)
      console.log('✅ Top tracks fetched successfully:', topTracks.body.items.length, 'tracks')
      console.log('✅ Sample tracks:', topTracks.body.items.slice(0, 3).map(t => ({
        name: t.name,
        artist: t.artists[0]?.name,
        id: t.id
      })))
    } catch (spotifyError: any) {
      console.error('Spotify API error (getMyTopTracks):', spotifyError)
      console.error('Spotify error details:', {
        message: spotifyError?.message,
        statusCode: spotifyError?.statusCode,
        body: spotifyError?.body
      })

      // Attempt a single token refresh and retry on 401/403
      if ((spotifyError?.statusCode === 401 || spotifyError?.statusCode === 403) && tokens?.refreshToken) {
        try {
          console.log('Refreshing Spotify token after top tracks failure...')
          const refreshed = await refreshSpotifyToken(tokens.refreshToken)
          accessToken = refreshed.accessToken
          await saveSpotifyTokens(user.id, refreshed.accessToken, tokens.refreshToken, refreshed.expiresIn)
          topTracks = await fetchTopTracks(accessToken)
          console.log('Top tracks fetched successfully after refresh')
        } catch (refreshError: any) {
          console.error('Refresh + retry (top tracks) failed:', refreshError)
          const statusCode = spotifyError?.statusCode === 403 ? 403 : 401
          return NextResponse.json(
            { error: 'Spotify permissions required. Please reconnect.' },
            { status: statusCode }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Failed to fetch tracks from Spotify. Please reconnect your account.' },
          { status: 500 }
        )
      }
    }

    // Analyze based on track metadata (popularity, release dates, etc.)
    console.log('✅ Analyzing tracks based on metadata (audio features disabled)')
    
    const tracks = topTracks.body.items.map(track => ({
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      image: track.album.images[0]?.url || '',
      uri: track.uri,
      popularity: track.popularity,
    }))

    // Calculate metrics based on track popularity and diversity
    const avgPopularity = tracks.reduce((sum, t) => sum + (t.popularity || 0), 0) / tracks.length
    const uniqueArtists = new Set(tracks.map(t => t.artist)).size
    const uniqueAlbums = new Set(tracks.map(t => t.album)).size
    
    // Generate simplified metrics (0-100 scale) based on available data
    const metrics = {
      popularity: Math.round(avgPopularity),
      diversity: Math.round((uniqueArtists / tracks.length) * 100),
      exploration: Math.round((uniqueAlbums / tracks.length) * 100),
      consistency: Math.round(100 - ((uniqueArtists / tracks.length) * 100)),
      trendiness: Math.round(avgPopularity * 0.9), // Slightly lower than raw popularity
    }

    console.log('✅ Calculated metrics from track metadata:', metrics)

    // Simple personality analysis based on listening diversity
    const personality = analyzePersonalitySimple({
      diversity: metrics.diversity,
      popularity: metrics.popularity,
      exploration: metrics.exploration,
    })

    console.log('✅ Personality analysis complete:', {
      type: personality.type,
      traits: personality.traits,
      metricsPercent: metrics
    })

    // Save the analysis to database
    try {
      await saveVibeAnalysis({
        user_id: user.id,
        personality_type: personality.type,
        personality_traits: personality.traits,
        personality_description: Array.isArray(personality.description) 
          ? personality.description.join('. ') + '.'
          : personality.description,
        valence: metrics.popularity,
        energy: metrics.trendiness,
        danceability: metrics.diversity,
        acousticness: metrics.exploration,
        instrumentalness: metrics.consistency,
        tracks: tracks,
      })
      console.log('✅ Vibe analysis saved to database successfully')
    } catch (dbError) {
      console.error('❌ Failed to save vibe analysis:', dbError)
      // Don't fail the request if database save fails
    }

    console.log('✅ Analysis complete - returning response')
    return NextResponse.json({
      tracks,
      personality,
      metrics,
      cached: false,
    })
  } catch (error: any) {
    console.error('Top tracks error:', error)
    console.error('Error details:', {
      message: error?.message,
      body: error?.body,
      statusCode: error?.statusCode
    })
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch top tracks' },
      { status: 500 }
    )
  }
}

function analyzePersonalitySimple(metrics: {
  diversity: number
  popularity: number
  exploration: number
}) {
  const traits: string[] = []
  const description: string[] = []

  // Diversity analysis
  if (metrics.diversity > 70) {
    traits.push('Eclectic Explorer')
    description.push('You love discovering music from many different artists')
  } else if (metrics.diversity < 40) {
    traits.push('Loyal Fan')
    description.push('You stick with your favorite artists and know their work deeply')
  } else {
    traits.push('Balanced Listener')
    description.push('You enjoy a healthy mix of favorites and new discoveries')
  }

  // Popularity analysis
  if (metrics.popularity > 70) {
    traits.push('Mainstream Enthusiast')
    description.push('You enjoy popular hits and trending music')
  } else if (metrics.popularity < 40) {
    traits.push('Underground Connoisseur')
    description.push('You appreciate lesser-known gems and indie artists')
  } else {
    traits.push('Diverse Taste')
    description.push('You blend mainstream hits with hidden treasures')
  }

  // Exploration analysis
  if (metrics.exploration > 70) {
    traits.push('Album Hopper')
    description.push('You love exploring full albums and diverse discographies')
  } else if (metrics.exploration < 40) {
    traits.push('Album Loyalist')
    description.push('You find albums you love and revisit them often')
  }

  // Overall personality type
  let type = 'The Balanced Curator'
  if (metrics.diversity > 70 && metrics.exploration > 70) {
    type = 'The Musical Explorer'
  } else if (metrics.diversity < 40 && metrics.popularity > 70) {
    type = 'The Superfan'
  } else if (metrics.diversity > 60 && metrics.popularity < 50) {
    type = 'The Indie Adventurer'
  } else if (metrics.popularity > 70) {
    type = 'The Chart Topper'
  }

  return {
    type,
    traits,
    description,
  }
}

function analyzePersonality(metrics: {
  valence: number
  energy: number
  danceability: number
  acousticness: number
  instrumentalness: number
}) {
  const traits: string[] = []
  const description: string[] = []

  // Mood analysis
  if (metrics.valence > 0.6) {
    traits.push('Optimistic')
    description.push('You tend to gravitate toward positive, uplifting music')
  } else if (metrics.valence < 0.4) {
    traits.push('Introspective')
    description.push('You appreciate emotionally deep and contemplative music')
  } else {
    traits.push('Balanced')
    description.push('You enjoy a mix of upbeat and melancholic music')
  }

  // Energy analysis
  if (metrics.energy > 0.6) {
    traits.push('Energetic')
    description.push('You prefer high-energy, intense tracks')
  } else if (metrics.energy < 0.4) {
    traits.push('Calm')
    description.push('You favor relaxed, mellow soundscapes')
  }

  // Danceability analysis
  if (metrics.danceability > 0.6) {
    traits.push('Rhythmic')
    description.push('You love danceable, groove-oriented music')
  }

  // Acousticness analysis
  if (metrics.acousticness > 0.5) {
    traits.push('Acoustic Lover')
    description.push('You appreciate organic, acoustic instruments')
  } else {
    traits.push('Electronic Enthusiast')
    description.push('You enjoy electronic and produced sounds')
  }

  // Instrumentalness analysis
  if (metrics.instrumentalness > 0.5) {
    traits.push('Instrumental Fan')
    description.push('You value musical composition over lyrics')
  }

  // Overall personality type
  let type = 'The Eclectic Listener'
  if (metrics.valence > 0.6 && metrics.energy > 0.6) {
    type = 'The Party Starter'
  } else if (metrics.valence < 0.4 && metrics.energy < 0.4) {
    type = 'The Contemplative Soul'
  } else if (metrics.acousticness > 0.6) {
    type = 'The Purist'
  } else if (metrics.danceability > 0.7) {
    type = 'The Groove Master'
  }

  return {
    type,
    traits,
    description,
  }
}
