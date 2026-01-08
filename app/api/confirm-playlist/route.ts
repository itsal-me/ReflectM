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
    if (!tokens) {
      return NextResponse.json({ error: 'Spotify not connected' }, { status: 401 })
    }

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
      console.error('Playlist creation returned null (likely no valid tracks)')
      return NextResponse.json(
        { error: 'Could not create playlist from the provided tracks. Please try regenerating.' },
        { status: 400 }
      )
    }

    // Save to reflections
    console.log('Saving reflection to database...')
    const { data: reflectionData, error: reflectionError } = await supabase.from('reflections').insert({
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
    
    if (reflectionError) {
      console.error('Failed to save reflection:', reflectionError)
      throw new Error('Failed to save playlist history')
    }
    
    console.log('Reflection saved successfully')

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
