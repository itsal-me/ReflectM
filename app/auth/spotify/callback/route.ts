import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { saveSpotifyTokens } from '@/lib/spotify/auth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const requestUrl = new URL(request.url)

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }

  // Create response object first
  const response = NextResponse.redirect(new URL('/connecting', request.url))

  // Create Supabase client with response cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

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

    // Try to sign in with Spotify email
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: spotifyProfile.email,
      password: `spotify_${spotifyProfile.id}`,
    })

    console.log("Sign in attempt:", spotifyProfile.email, "Error:", signInError?.message, "Has session:", !!signInData?.session)

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
        },
      })

      if (signUpError) {
        console.error('Sign up error:', signUpError)
        return NextResponse.redirect(new URL('/connecting?error=signup_failed', request.url))
      }

      if (!signUpData.user) {
        return NextResponse.redirect(new URL('/connecting?error=no_user', request.url))
      }

      userId = signUpData.user.id

      // If no session after signup, sign in again
      if (!signUpData.session) {
        const { data: newSignInData, error: newSignInError } = await supabase.auth.signInWithPassword({
          email: spotifyProfile.email,
          password: `spotify_${spotifyProfile.id}`,
        })

        if (newSignInError) {
          console.error('Sign in after signup error:', newSignInError)
          return NextResponse.redirect(new URL('/connecting?error=signin_failed', request.url))
        }
      }
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

    return response
  } catch (error) {
    console.error('Spotify OAuth error:', error)
    return NextResponse.redirect(new URL('/connecting?error=auth_failed', request.url))
  }
}
