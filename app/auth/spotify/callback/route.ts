import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { saveSpotifyTokens } from '@/lib/spotify/auth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(
      'https://accounts.spotify.com/api/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
        }),
      }
    )

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    const tokenData = await tokenResponse.json()

    // Get Spotify user profile
    const spotifyProfileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!spotifyProfileResponse.ok) {
      throw new Error('Failed to fetch Spotify profile')
    }

    const spotifyProfile = await spotifyProfileResponse.json()

    // Create/login user in Supabase using Spotify email
    const supabase = await createClient()
    
    // Try to sign in with Spotify email
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: spotifyProfile.email,
      password: `spotify_${spotifyProfile.id}`, // Use Spotify ID as password
    })

    let userId: string

    if (signInError) {
      // User doesn't exist, create new account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: spotifyProfile.email,
        password: `spotify_${spotifyProfile.id}`,
        options: {
          data: {
            display_name: spotifyProfile.display_name,
            spotify_id: spotifyProfile.id,
          },
          emailRedirectTo: undefined, // Skip email confirmation
        },
      })

      if (signUpError) {
        throw new Error('Failed to create user account')
      }

      userId = signUpData.user!.id
    } else {
      userId = signInData.user.id
    }

    // Save Spotify tokens to database
    await saveSpotifyTokens(
      userId,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    )

    return NextResponse.redirect(
      new URL('/dashboard?spotify=connected', request.url)
    )
  } catch (error) {
    console.error('Spotify OAuth error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
}
