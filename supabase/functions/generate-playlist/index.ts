// Follow this guide to set up:
// https://supabase.com/docs/guides/functions/quickstart

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface GenerateRequest {
  prompt: string
  discoveryMode: boolean
  weather?: string
  timeOfDay?: string
  topArtists?: string[]
}

interface AIResponse {
  playlist_name: string
  tracks: Array<{ song: string; artist: string }>
  narrative: string
  valence: number
  energy: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, discoveryMode, weather, timeOfDay, topArtists }: GenerateRequest =
      await req.json()

    // Build context for AI
    let contextPrompt = `User's mood/prompt: "${prompt}"`
    
    if (weather) {
      contextPrompt += `\nCurrent weather: ${weather}`
    }
    
    if (timeOfDay) {
      contextPrompt += `\nTime of day: ${timeOfDay}`
    }

    if (discoveryMode) {
      contextPrompt += '\nMode: Discovery - suggest lesser-known artists and hidden gems'
    } else if (topArtists && topArtists.length > 0) {
      contextPrompt += `\nMode: Comfort Zone - user frequently listens to: ${topArtists.slice(0, 10).join(', ')}`
    }

    // Call OpenRouter API
    const openRouterResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
          'HTTP-Referer': 'https://reflectm.app',
          'X-Title': 'ReflectM',
        } as HeadersInit,
        body: JSON.stringify({
          model: 'google/gemma-2-27b-it',
          messages: [
            {
              role: 'system',
              content: `You are ReflectM, an AI that creates personalized Spotify playlists with cinematic narratives.

CRITICAL RULES:
1. Return ONLY valid JSON. No markdown, no code blocks, no extra text.
2. Create exactly 15-20 songs for the playlist
3. Each song must be a real, existing track (verify artist and song name accuracy)
4. The narrative must be EXACTLY 2 sentences that paint a movie scene matching the playlist's mood
5. Valence: 0-1 scale (0=sad/negative, 1=happy/positive)
6. Energy: 0-1 scale (0=calm/acoustic, 1=intense/energetic)

JSON FORMAT (return exactly this structure):
{
  "playlist_name": "A creative 2-4 word playlist name",
  "tracks": [
    {"song": "Exact Song Title", "artist": "Exact Artist Name"},
    {"song": "Another Song", "artist": "Another Artist"}
  ],
  "narrative": "First sentence sets the scene. Second sentence describes what happens next.",
  "valence": 0.7,
  "energy": 0.6
}`,
            },
            {
              role: 'user',
              content: contextPrompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 2000,
        }),
      }
    )

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text()
      console.error('OpenRouter error:', errorText)
      throw new Error(`OpenRouter API failed: ${openRouterResponse.status}`)
    }

    const openRouterData: any = await openRouterResponse.json()
    const aiResponseText: string = openRouterData.choices[0].message.content

    console.log('Raw AI response:', aiResponseText.substring(0, 200))

    // Parse AI response (handle potential markdown wrapping and extra text)
    let cleanedResponse = aiResponseText.trim()
    
    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Find JSON object boundaries if there's extra text
    const jsonStart = cleanedResponse.indexOf('{')
    const jsonEnd = cleanedResponse.lastIndexOf('}') + 1
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd)
    }
    
    console.log('Cleaned response:', cleanedResponse.substring(0, 200))

    let aiResponse: AIResponse
    try {
      aiResponse = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Failed to parse:', cleanedResponse)
      throw new Error('AI returned invalid JSON format. Please try again.')
    }

    // Validate response structure
    if (
      !aiResponse.playlist_name ||
      !Array.isArray(aiResponse.tracks) ||
      !aiResponse.narrative ||
      typeof aiResponse.valence !== 'number' ||
      typeof aiResponse.energy !== 'number'
    ) {
      throw new Error('Invalid AI response structure')
    }

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
