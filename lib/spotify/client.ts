import SpotifyWebApi from 'spotify-web-api-node'

export function createSpotifyApi(accessToken?: string) {
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
  })

  if (accessToken) {
    spotifyApi.setAccessToken(accessToken)
  }

  return spotifyApi
}

export interface Track {
  song: string
  artist: string
}

export async function searchTrack(
  spotifyApi: SpotifyWebApi,
  song: string,
  artist: string
): Promise<string | null> {
  try {
    const query = `track:${song} artist:${artist}`
    const result = await spotifyApi.searchTracks(query, { limit: 1 })

    if (result.body.tracks?.items && result.body.tracks.items.length > 0) {
      return result.body.tracks.items[0].uri
    }

    // Fallback: search with just song name
    const fallbackResult = await spotifyApi.searchTracks(song, { limit: 1 })
    if (
      fallbackResult.body.tracks?.items &&
      fallbackResult.body.tracks.items.length > 0
    ) {
      return fallbackResult.body.tracks.items[0].uri
    }

    return null
  } catch (error) {
    console.error(`Error searching for ${song} by ${artist}:`, error)
    return null
  }
}

export async function createPlaylistFromTracks(
  spotifyApi: SpotifyWebApi,
  userId: string,
  playlistName: string,
  tracks: Track[],
  description?: string
): Promise<{ playlistId: string; playlistUrl: string } | null> {
  try {
    // Create the playlist
    const playlist = await spotifyApi.createPlaylist(playlistName, {
      description:
        description || 'Created with ReflectM - AI-powered playlist generator',
      public: true,
    })

    const playlistId = playlist.body.id

    // Search for track URIs
    const trackUris: string[] = []
    for (const track of tracks) {
      const uri = await searchTrack(spotifyApi, track.song, track.artist)
      if (uri) {
        trackUris.push(uri)
      }
    }

    // Add tracks to playlist (Spotify API limits to 100 tracks per request)
    if (trackUris.length > 0) {
      const chunks = []
      for (let i = 0; i < trackUris.length; i += 100) {
        chunks.push(trackUris.slice(i, i + 100))
      }

      for (const chunk of chunks) {
        await spotifyApi.addTracksToPlaylist(playlistId, chunk)
      }
    }

    return {
      playlistId,
      playlistUrl: playlist.body.external_urls.spotify,
    }
  } catch (error) {
    console.error('Error creating playlist:', error)
    return null
  }
}

export async function getUserProfile(spotifyApi: SpotifyWebApi) {
  try {
    const profile = await spotifyApi.getMe()
    return profile.body
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

export async function getUserTopArtists(
  spotifyApi: SpotifyWebApi,
  limit: number = 20
) {
  try {
    const topArtists = await spotifyApi.getMyTopArtists({ limit })
    return topArtists.body.items.map((artist) => artist.name)
  } catch (error) {
    console.error('Error fetching top artists:', error)
    return []
  }
}
