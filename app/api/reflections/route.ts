import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching reflections:', error)
      return NextResponse.json({ error: 'Failed to fetch reflections' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    console.error('Unexpected reflections error:', error)
    return NextResponse.json({ error: 'Failed to fetch reflections' }, { status: 500 })
  }
}
