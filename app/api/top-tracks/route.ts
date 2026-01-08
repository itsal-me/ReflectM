import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSpotifyApi } from '@/lib/spotify/client'
import { getSpotifyTokens, refreshSpotifyToken, saveSpotifyTokens } from '@/lib/spotify/auth'
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
      console.log('Token valid, user:', me.body.display_name || me.body.id)
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
    let topTracks
    try {
      topTracks = await spotifyApi.getMyTopTracks({
        limit: 50,
        time_range: 'short_term', // last 4 weeks
      })
      console.log('Top tracks fetched:', topTracks.body.items.length)
    } catch (spotifyError: any) {
      console.error('Spotify API error (getMyTopTracks):', spotifyError)
      console.error('Spotify error details:', {
        message: spotifyError?.message,
        statusCode: spotifyError?.statusCode,
        body: spotifyError?.body
      })
      return NextResponse.json(
        { error: 'Failed to fetch tracks from Spotify. Please reconnect your account.' },
        { status: 500 }
      )
    }

    // Fetch audio features for analysis (Spotify API limits to 100 tracks per request)
    const trackIds = topTracks.body.items.map(track => track.id).filter(id => id)
    console.log('Fetching audio features for', trackIds.length, 'tracks')
    
    if (trackIds.length === 0) {
      console.error('No valid track IDs found')
      return NextResponse.json(
        { error: 'No tracks available to analyze' },
        { status: 500 }
      )
    }
    
    let audioFeatures
    const fetchAudioFeatures = async (tokenToUse: string) => {
      const api = createSpotifyApi(tokenToUse)
      if (tokenToUse !== accessToken) {
        console.log('Retrying audio features with refreshed token')
      }

      // Batch requests if more than 50 tracks (Spotify sometimes has issues with large batches)
      if (trackIds.length > 50) {
        console.log('Batching audio features request...')
        const batch1 = await api.getAudioFeaturesForTracks(trackIds.slice(0, 50))
        const batch2 = await api.getAudioFeaturesForTracks(trackIds.slice(50))
        return {
          body: {
            audio_features: [...batch1.body.audio_features, ...batch2.body.audio_features]
          }
        }
      }
      return await api.getAudioFeaturesForTracks(trackIds)
    }

    try {
      audioFeatures = await fetchAudioFeatures(accessToken)
      console.log('Audio features fetched successfully')
    } catch (spotifyError: any) {
      console.error('Spotify API error (getAudioFeaturesForTracks):', spotifyError)
      console.error('Spotify error details:', {
        message: spotifyError?.message,
        statusCode: spotifyError?.statusCode,
        body: spotifyError?.body
      })

      // Attempt a single token refresh and retry on 401/403
      if ((spotifyError?.statusCode === 401 || spotifyError?.statusCode === 403) && tokens?.refreshToken) {
        try {
          console.log('Refreshing Spotify token after audio feature failure...')
          const refreshed = await refreshSpotifyToken(tokens.refreshToken)
          accessToken = refreshed.accessToken
          await saveSpotifyTokens(user.id, refreshed.accessToken, tokens.refreshToken, refreshed.expiresIn)
          audioFeatures = await fetchAudioFeatures(accessToken)
          console.log('Audio features fetched successfully after refresh')
        } catch (refreshError: any) {
          console.error('Refresh + retry failed:', refreshError)
          const statusCode = spotifyError?.statusCode === 403 ? 403 : 401
          return NextResponse.json(
            { error: 'Spotify permissions required. Please reconnect.' },
            { status: statusCode }
          )
        }
      } else {
        const statusCode = spotifyError?.statusCode === 403 ? 403 : 500
        return NextResponse.json(
          { 
            error: statusCode === 403 
              ? 'Spotify permissions required. Please reconnect.' 
              : 'Failed to analyze tracks from Spotify' 
          },
          { status: statusCode }
        )
      }
    }

    // Calculate personality metrics
    const features = audioFeatures.body.audio_features.filter(f => f !== null)
    
    const avgValence = features.reduce((sum, f) => sum + (f?.valence || 0), 0) / features.length
    const avgEnergy = features.reduce((sum, f) => sum + (f?.energy || 0), 0) / features.length
    const avgDanceability = features.reduce((sum, f) => sum + (f?.danceability || 0), 0) / features.length
    const avgAcousticness = features.reduce((sum, f) => sum + (f?.acousticness || 0), 0) / features.length
    const avgInstrumentalness = features.reduce((sum, f) => sum + (f?.instrumentalness || 0), 0) / features.length

    // Personality analysis based on listening patterns
    const personality = analyzePersonality({
      valence: avgValence,
      energy: avgEnergy,
      danceability: avgDanceability,
      acousticness: avgAcousticness,
      instrumentalness: avgInstrumentalness,
    })

    // Get top genres
    const genreMap = new Map<string, number>()
    topTracks.body.items.forEach(track => {
      track.artists.forEach(artist => {
        // Note: artist genres not available in track object, need separate call
      })
    })

    const tracks = topTracks.body.items.map(track => ({
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      image: track.album.images[0]?.url || '',
      uri: track.uri,
    }))

    const metrics = {
      valence: Math.round(avgValence * 100),
      energy: Math.round(avgEnergy * 100),
      danceability: Math.round(avgDanceability * 100),
      acousticness: Math.round(avgAcousticness * 100),
      instrumentalness: Math.round(avgInstrumentalness * 100),
    }

    // Save the analysis to database
    try {
      await saveVibeAnalysis({
        user_id: user.id,
        personality_type: personality.type,
        personality_traits: personality.traits,
        personality_description: Array.isArray(personality.description) 
          ? personality.description.join('. ') + '.'
          : personality.description,
        valence: metrics.valence,
        energy: metrics.energy,
        danceability: metrics.danceability,
        acousticness: metrics.acousticness,
        instrumentalness: metrics.instrumentalness,
        tracks: tracks,
      })
      console.log('Vibe analysis saved to database')
    } catch (dbError) {
      console.error('Failed to save vibe analysis:', dbError)
      // Don't fail the request if database save fails
    }

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
