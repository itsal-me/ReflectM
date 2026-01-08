import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSpotifyApi, createPlaylistFromTracks, getUserTopArtists } from '@/lib/spotify/client'
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

    const { prompt, discoveryMode, weather, timeOfDay } = await request.json()

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

    // Get user's top artists if not in discovery mode
    let topArtists: string[] = []
    if (!discoveryMode && accessToken) {
      const spotifyApi = createSpotifyApi(accessToken)
      topArtists = await getUserTopArtists(spotifyApi)
    }

    // Call Supabase Edge Function for AI generation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const edgeFunctionResponse = await fetch(
      `${supabaseUrl}/functions/v1/generate-playlist`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          prompt,
          discoveryMode,
          weather,
          timeOfDay,
          topArtists,
        }),
      }
    )

    if (!edgeFunctionResponse.ok) {
      throw new Error('AI generation failed')
    }

    const aiResult = await edgeFunctionResponse.json()

    let playlistUrl: string | undefined

    // Create Spotify playlist if connected
    if (accessToken) {
      const spotifyApi = createSpotifyApi(accessToken)
      const userProfile = await spotifyApi.getMe()

      const playlistData = await createPlaylistFromTracks(
        spotifyApi,
        userProfile.body.id,
        aiResult.playlist_name,
        aiResult.tracks,
        aiResult.narrative
      )

      if (playlistData) {
        playlistUrl = playlistData.playlistUrl

        // Save to reflections
        await supabase.from('reflections').insert({
          user_id: user.id,
          prompt,
          playlist_name: aiResult.playlist_name,
          narrative: aiResult.narrative,
          spotify_playlist_id: playlistData.playlistId,
          spotify_playlist_url: playlistData.playlistUrl,
          valence: aiResult.valence,
          energy: aiResult.energy,
          discovery_mode: discoveryMode,
          weather_condition: weather,
          time_of_day: timeOfDay,
          tracks: aiResult.tracks,
        })
      }
    } else {
      // Save to reflections without Spotify data
      await supabase.from('reflections').insert({
        user_id: user.id,
        prompt,
        playlist_name: aiResult.playlist_name,
        narrative: aiResult.narrative,
        valence: aiResult.valence,
        energy: aiResult.energy,
        discovery_mode: discoveryMode,
        weather_condition: weather,
        time_of_day: timeOfDay,
        tracks: aiResult.tracks,
      })
    }

    return NextResponse.json({
      ...aiResult,
      spotify_url: playlistUrl,
    })
  } catch (error) {
    console.error('Generate API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate playlist' },
      { status: 500 }
    )
  }
}
