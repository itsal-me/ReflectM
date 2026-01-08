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

    console.log('Calling Edge Function:', `${supabaseUrl}/functions/v1/generate-playlist`)
    console.log('Request payload:', { prompt, discoveryMode, weather, timeOfDay, topArtistsCount: topArtists.length })

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

    console.log('Edge Function Response Status:', edgeFunctionResponse.status)
    console.log('Edge Function Response OK:', edgeFunctionResponse.ok)

    if (!edgeFunctionResponse.ok) {
      const errorText = await edgeFunctionResponse.text()
      console.error('Edge Function Error Response:', errorText)
      console.error('Edge Function Status:', edgeFunctionResponse.status)
      throw new Error(`AI generation failed: ${edgeFunctionResponse.status} - ${errorText}`)
    }

    const aiResult = await edgeFunctionResponse.json()

    // Return AI result without creating Spotify playlist yet
    // User will confirm on the next page
    return NextResponse.json({
      ...aiResult,
      prompt,
      discoveryMode,
      weather,
      timeOfDay,
    })
  } catch (error: any) {
    console.error('Generate API error:', error)
    console.error('Error details:', {
      message: error?.message,
      response: error?.response,
      status: error?.status
    })
    return NextResponse.json(
      { error: error?.message || 'Failed to generate playlist' },
      { status: 500 }
    )
  }
}
