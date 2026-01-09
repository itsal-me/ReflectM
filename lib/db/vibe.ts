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

  // Always create a new record to maintain analysis history
  const payload = {
    ...analysis,
    analyzed_at: new Date().toISOString(),
  }

  // Insert new record (don't update existing ones)
  const { data, error } = await supabase
    .from('vibe_analysis')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error saving vibe analysis:', error)
    throw error
  }

  console.log('✓ New vibe analysis saved to database:', data.id)
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
