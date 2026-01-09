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

ABSOLUTE REQUIREMENTS - FAILURE TO COMPLY WILL RESULT IN ERROR:
1. You MUST return ONLY valid JSON. Absolutely NO markdown, NO code blocks (no \`\`\`json), NO explanatory text before or after
2. Start your response with { and end with }
3. Create exactly 15-20 songs for the playlist
4. Each song must be a real, existing track (verify artist and song name accuracy)
5. The narrative must be EXACTLY 2 sentences that paint a movie scene matching the playlist's mood
6. Valence: 0-1 scale (0=sad/negative, 1=happy/positive)
7. Energy: 0-1 scale (0=calm/acoustic, 1=intense/energetic)

EXACT JSON FORMAT - Copy this structure precisely:
{
  "playlist_name": "A creative 2-4 word playlist name",
  "tracks": [
    {"song": "Exact Song Title", "artist": "Exact Artist Name"},
    {"song": "Another Song", "artist": "Another Artist"}
  ],
  "narrative": "First sentence sets the scene. Second sentence describes what happens next.",
  "valence": 0.7,
  "energy": 0.6
}

EXAMPLE VALID RESPONSE:
{"playlist_name":"Midnight Drive","tracks":[{"song":"Blinding Lights","artist":"The Weeknd"}],"narrative":"City lights blur past as you speed through empty streets at 2 AM. The night holds infinite possibilities.","valence":0.7,"energy":0.8}`,
            },
            {
              role: 'user',
              content: contextPrompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
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

    console.log('Raw AI response:', aiResponseText.substring(0, 300))

    // Multi-stage JSON parsing with fallback strategies
    let cleanedResponse = aiResponseText.trim()
    
    // Stage 1: Remove markdown code blocks
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Stage 2: Find JSON object boundaries
    const jsonStart = cleanedResponse.indexOf('{')
    const jsonEnd = cleanedResponse.lastIndexOf('}') + 1
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd)
    }
    
    // Stage 3: Remove control characters and fix common issues
    cleanedResponse = cleanedResponse
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .trim()
    
    console.log('Cleaned response (first 300 chars):', cleanedResponse.substring(0, 300))

    let aiResponse: AIResponse
    try {
      aiResponse = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Failed response (first 500 chars):', cleanedResponse.substring(0, 500))
      
      // Stage 4: Try regex extraction as last resort
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          aiResponse = JSON.parse(jsonMatch[0])
          console.log('✓ Recovered JSON using regex fallback')
        } catch (fallbackError) {
          throw new Error('AI returned invalid JSON format after all recovery attempts. Please try again.')
        }
      } else {
        throw new Error('AI returned invalid JSON format. No valid JSON object found. Please try again.')
      }
    }

    // Strict validation with detailed error messages
    const validationErrors: string[] = []
    
    if (!aiResponse.playlist_name || typeof aiResponse.playlist_name !== 'string') {
      validationErrors.push('Missing or invalid playlist_name')
    }
    
    if (!Array.isArray(aiResponse.tracks)) {
      validationErrors.push('Missing or invalid tracks array')
    } else if (aiResponse.tracks.length === 0) {
      validationErrors.push('Tracks array is empty')
    } else {
      aiResponse.tracks.forEach((track, index) => {
        if (!track.song || typeof track.song !== 'string') {
          validationErrors.push(`Track ${index + 1}: missing or invalid song name`)
        }
        if (!track.artist || typeof track.artist !== 'string') {
          validationErrors.push(`Track ${index + 1}: missing or invalid artist name`)
        }
      })
    }
    
    if (!aiResponse.narrative || typeof aiResponse.narrative !== 'string') {
      validationErrors.push('Missing or invalid narrative')
    }
    
    if (typeof aiResponse.valence !== 'number' || aiResponse.valence < 0 || aiResponse.valence > 1) {
      validationErrors.push('Invalid valence (must be number between 0 and 1)')
    }
    
    if (typeof aiResponse.energy !== 'number' || aiResponse.energy < 0 || aiResponse.energy > 1) {
      validationErrors.push('Invalid energy (must be number between 0 and 1)')
    }
    
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors)
      console.error('Invalid response:', aiResponse)
      throw new Error(`Invalid AI response: ${validationErrors.join(', ')}`)
    }
    
    console.log('✓ AI response validated successfully')

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
