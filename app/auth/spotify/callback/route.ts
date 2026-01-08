import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { saveSpotifyTokens } from '@/lib/spotify/auth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  console.log('=== Spotify Callback Start ===')

  if (error) {
    console.log('Spotify returned error:', error)
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
  }

  if (!code) {
    console.log('No code in callback')
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }

  try {
    // Exchange code for tokens first
    console.log('Exchanging code for tokens...')
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
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      throw new Error('Failed to exchange code for tokens')
    }

    const tokenData = await tokenResponse.json()
    console.log('Token exchange successful')

    // Get Spotify user profile
    console.log('Fetching Spotify profile...')
    const spotifyProfileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!spotifyProfileResponse.ok) {
      throw new Error('Failed to fetch Spotify profile')
    }

    const spotifyProfile = await spotifyProfileResponse.json()
    console.log('Spotify profile:', spotifyProfile.email, 'ID:', spotifyProfile.id)

    // Create response FIRST - this is the response we'll return with cookies
    const response = NextResponse.redirect(new URL('/connecting', request.url))
    
    // Create supabase client that writes cookies to our response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            console.log('Setting cookies:', cookiesToSet.map(c => ({ name: c.name, options: c.options })))
            cookiesToSet.forEach(({ name, value, options }) => {
              // Ensure cookies work across localhost/127.0.0.1
              response.cookies.set(name, value, {
                ...options,
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
              })
            })
          },
        },
      }
    )

    const password = `spotify_${spotifyProfile.id}`
    let userId: string
    let hasSession = false

    // Step 1: Try to sign in (existing user)
    console.log('Attempting sign in for:', spotifyProfile.email)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: spotifyProfile.email,
      password: password,
    })

    console.log('Sign in result - Error:', signInError?.message, 'Has session:', !!signInData?.session)

    if (signInData?.session) {
      // Successfully signed in existing user
      console.log('✓ Signed in existing user')
      userId = signInData.user.id
      hasSession = true
    } else {
      // Step 2: Sign in failed, try to create new user
      console.log('Sign in failed, attempting signup...')
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: spotifyProfile.email,
        password: password,
        options: {
          data: {
            display_name: spotifyProfile.display_name,
            spotify_id: spotifyProfile.id,
          },
          // This tells Supabase to skip email confirmation
          emailRedirectTo: undefined,
        },
      })

      console.log('Sign up result - Error:', signUpError?.message, 'Has session:', !!signUpData?.session, 'Has user:', !!signUpData?.user)

      if (signUpError) {
        console.error('Sign up failed:', signUpError.message)
        
        // If user already exists but password is wrong, we have a problem
        if (signUpError.message.includes('already registered')) {
          console.error('User exists with different password - cannot authenticate')
          return NextResponse.redirect(new URL('/connecting?error=user_exists_different_password', request.url))
        }
        
        return NextResponse.redirect(new URL('/connecting?error=signup_failed', request.url))
      }

      if (!signUpData.user) {
        console.error('No user returned from signup')
        return NextResponse.redirect(new URL('/connecting?error=no_user', request.url))
      }

      userId = signUpData.user.id

      if (signUpData.session) {
        console.log('✓ Signup returned session directly')
        hasSession = true
      } else {
        // No session after signup - likely needs email confirmation
        // Try signing in one more time
        console.log('No session after signup, trying sign in again...')
        
        const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
          email: spotifyProfile.email,
          password: password,
        })

        console.log('Retry sign in - Error:', retryError?.message, 'Has session:', !!retrySignIn?.session)

        if (retrySignIn?.session) {
          console.log('✓ Retry sign in successful')
          hasSession = true
        } else {
          console.error('Could not establish session - email confirmation may be required')
          // Continue anyway - we'll save tokens but user won't have a session
        }
      }
    }

    // Save Spotify tokens to database
    console.log('Saving Spotify tokens for user:', userId)
    try {
      await saveSpotifyTokens(
        userId,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_in
      )
      console.log('✓ Spotify tokens saved')
    } catch (tokenSaveError) {
      console.error('Failed to save Spotify tokens:', tokenSaveError)
      // Continue anyway - auth might still work
    }

    // Log final cookie state
    const responseCookies = response.cookies.getAll()
    console.log('Response cookies:', responseCookies.map(c => c.name))
    console.log('=== Spotify Callback End - Has Session:', hasSession, '===')

    return response
  } catch (error) {
    console.error('Spotify OAuth error:', error)
    return NextResponse.redirect(new URL('/connecting?error=auth_failed', request.url))
  }
}
