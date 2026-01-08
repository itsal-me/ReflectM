import { createClient } from '@/lib/supabase/server'

export interface VibeAnalysis {
  id?: string
  user_id: string
  personality_type: string
  personality_traits: string[]
  personality_description: string
  valence: number
  energy: number
  danceability: number
  acousticness: number
  instrumentalness: number
  tracks: any[]
  analyzed_at?: string
  created_at?: string
}

export async function saveVibeAnalysis(analysis: Omit<VibeAnalysis, 'id' | 'created_at'>) {
  const supabase = await createClient()

  // Check if a record exists for this user
  const { data: existing } = await supabase
    .from('vibe_analysis')
    .select('id')
    .eq('user_id', analysis.user_id)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single()

  const payload = {
    ...analysis,
    analyzed_at: new Date().toISOString(),
  }

  let data, error

  if (existing) {
    // Update existing record
    const result = await supabase
      .from('vibe_analysis')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
    
    data = result.data
    error = result.error
  } else {
    // Insert new record
    const result = await supabase
      .from('vibe_analysis')
      .insert(payload)
      .select()
      .single()
    
    data = result.data
    error = result.error
  }

  if (error) {
    console.error('Error saving vibe analysis:', error)
    throw error
  }

  return data
}

export async function getLatestVibeAnalysis(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vibe_analysis')
    .select('*')
    .eq('user_id', userId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null
    }
    console.error('Error fetching vibe analysis:', error)
    throw error
  }

  return data
}

export async function getVibeAnalysisHistory(userId: string, limit = 10) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vibe_analysis')
    .select('*')
    .eq('user_id', userId)
    .order('analyzed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching vibe analysis history:', error)
    throw error
  }

  return data
}
