import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user before signing out
    const { data: { user } } = await supabase.auth.getUser()
    
    // Clear Spotify tokens from database if user exists
    if (user) {
      await supabase
        .from('user_preferences')
        .update({
          spotify_access_token: null,
          spotify_refresh_token: null,
          spotify_token_expires_at: null,
        })
        .eq('user_id', user.id)
    }
    
    // Sign out (clears session on server)
    await supabase.auth.signOut()
    
    // Create response that redirects to home
    const response = NextResponse.json({ success: true })
    
    // Explicitly clear all auth cookies
    response.cookies.delete('sb-zjgnyqdmhjpojnjsdvhp-auth-token.0')
    response.cookies.delete('sb-zjgnyqdmhjpojnjsdvhp-auth-token.1')
    response.cookies.delete('sb-zjgnyqdmhjpojnjsdvhp-auth-token')
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}
