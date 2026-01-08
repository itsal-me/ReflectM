import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSpotifyApi } from '@/lib/spotify/client'
import { getSpotifyTokens, refreshSpotifyToken, saveSpotifyTokens } from '@/lib/spotify/auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Spotify tokens
    const tokens = await getSpotifyTokens(user.id)
    let accessToken = tokens?.accessToken

    // Refresh token if expired
    if (tokens && tokens.expiresAt && new Date(tokens.expiresAt) < new Date()) {
      if (tokens.refreshToken) {
        const refreshed = await refreshSpotifyToken(tokens.refreshToken)
        accessToken = refreshed.accessToken
        await saveSpotifyTokens(
          user.id,
          refreshed.accessToken,
          tokens.refreshToken,
          refreshed.expiresIn
        )
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No Spotify token' }, { status: 401 })
    }

    const spotifyApi = createSpotifyApi(accessToken)
    
    // Fetch top tracks from last 1 month (short_term)
    const topTracks = await spotifyApi.getMyTopTracks({
      limit: 50,
      time_range: 'short_term', // last 4 weeks
    })

    // Fetch audio features for analysis
    const trackIds = topTracks.body.items.map(track => track.id)
    const audioFeatures = await spotifyApi.getAudioFeaturesForTracks(trackIds)

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

    return NextResponse.json({
      tracks,
      personality,
      metrics: {
        valence: Math.round(avgValence * 100),
        energy: Math.round(avgEnergy * 100),
        danceability: Math.round(avgDanceability * 100),
        acousticness: Math.round(avgAcousticness * 100),
        instrumentalness: Math.round(avgInstrumentalness * 100),
      },
    })
  } catch (error) {
    console.error('Top tracks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch top tracks' },
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
