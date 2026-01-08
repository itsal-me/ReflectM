import { createClient } from '@/lib/supabase/server'

export async function getSpotifyTokens(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_preferences')
    .select('spotify_access_token, spotify_refresh_token, spotify_token_expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    accessToken: data.spotify_access_token,
    refreshToken: data.spotify_refresh_token,
    expiresAt: data.spotify_token_expires_at,
  }
}

export async function saveSpotifyTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  const supabase = await createClient()

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  console.log('Saving tokens for user:', userId)
  console.log('Token expires at:', expiresAt)

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      spotify_access_token: accessToken,
      spotify_refresh_token: refreshToken,
      spotify_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Failed to save Spotify tokens:', error)
    throw new Error(`Database error: ${error.message}`)
  }

  console.log('Tokens saved successfully')
  return true
}

export async function clearSpotifyTokens(userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('user_preferences')
    .update({
      spotify_access_token: null,
      spotify_refresh_token: null,
      spotify_token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to clear Spotify tokens:', error)
    throw new Error(`Database error: ${error.message}`)
  }

  console.log('Spotify tokens cleared for user:', userId)
}

export async function refreshSpotifyToken(refreshToken: string) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  }
}
