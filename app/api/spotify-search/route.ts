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

    const searchParams = request.nextUrl.searchParams
    const song = searchParams.get('song')
    const artist = searchParams.get('artist')

    if (!song || !artist) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
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
    
    // Search for the track
    const searchResults = await spotifyApi.searchTracks(`track:${song} artist:${artist}`, {
      limit: 1,
    })

    if (searchResults.body.tracks && searchResults.body.tracks.items.length > 0) {
      const track = searchResults.body.tracks.items[0]
      return NextResponse.json({
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        image: track.album.images[0]?.url || '',
        uri: track.uri,
      })
    }

    return NextResponse.json({
      name: song,
      artist: artist,
      album: 'Unknown',
      image: '',
      uri: '',
    })
  } catch (error) {
    console.error('Spotify search error:', error)
    return NextResponse.json(
      { error: 'Failed to search Spotify' },
      { status: 500 }
    )
  }
}
