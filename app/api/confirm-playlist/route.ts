import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSpotifyApi, createPlaylistFromTracks } from '@/lib/spotify/client'
import { getSpotifyTokens, refreshSpotifyToken, saveSpotifyTokens } from '@/lib/spotify/auth'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { playlist_name, tracks, narrative, valence, energy, prompt, discoveryMode, weather, timeOfDay } = await request.json()

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
    const userProfile = await spotifyApi.getMe()

    // Create Spotify playlist
    const playlistData = await createPlaylistFromTracks(
      spotifyApi,
      userProfile.body.id,
      playlist_name,
      tracks,
      narrative
    )

    if (!playlistData) {
      throw new Error('Failed to create playlist')
    }

    // Save to reflections
    await supabase.from('reflections').insert({
      user_id: user.id,
      prompt: prompt || '',
      playlist_name,
      narrative,
      spotify_playlist_id: playlistData.playlistId,
      spotify_playlist_url: playlistData.playlistUrl,
      valence,
      energy,
      discovery_mode: discoveryMode || false,
      weather_condition: weather,
      time_of_day: timeOfDay,
      tracks,
    })

    return NextResponse.json({
      success: true,
      spotify_url: playlistData.playlistUrl,
    })
  } catch (error) {
    console.error('Confirm playlist error:', error)
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 }
    )
  }
}
