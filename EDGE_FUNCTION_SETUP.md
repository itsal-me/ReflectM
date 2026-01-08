# Edge Function Deployment Guide

## Current Error

The `/api/generate` endpoint is failing with a 500 error because the Supabase Edge Function is either:

1. Not deployed
2. Missing the `OPENROUTER_API_KEY` secret
3. OpenRouter API is failing

## Quick Fix Steps

### 1. Get Your OpenRouter API Key

1. Go to https://openrouter.ai/
2. Sign up or login
3. Go to Keys section: https://openrouter.ai/keys
4. Create a new API key
5. Copy the key (starts with `sk-or-v1-...`)

### 2. Install Supabase CLI

```bash
npm install -g supabase
```

### 3. Login to Supabase

```bash
supabase login
```

### 4. Link Your Project

```bash
cd "E:\REFLECTM app\reflectm"
supabase link --project-ref zjgnyqdmhjpojnjsdvhp
```

### 5. Set the OpenRouter API Key Secret

```bash
supabase secrets set OPENROUTER_API_KEY=your-actual-api-key-here
```

**Example:**

```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-abc123xyz...
```

### 6. Deploy the Edge Function

```bash
supabase functions deploy generate-playlist
```

### 7. Verify Deployment

After deployment, you should see:

```
Deployed Function generate-playlist on project zjgnyqdmhjpojnjsdvhp
```

### 8. Test the Function

Try generating a playlist in your app. Check the logs with:

```bash
supabase functions logs generate-playlist
```

## Verify Edge Function URL

The function should be accessible at:

```
https://zjgnyqdmhjpojnjsdvhp.supabase.co/functions/v1/generate-playlist
```

## Troubleshooting

### If you get "Function not found"

-   Make sure you ran `supabase functions deploy generate-playlist`
-   Verify in Supabase Dashboard → Edge Functions

### If you get "OpenRouter API failed"

-   Check if OPENROUTER_API_KEY is set correctly
-   Verify your OpenRouter account has credits
-   Check OpenRouter API status

### If you get "Invalid AI response structure"

-   The AI model might be returning malformed JSON
-   Check the Edge Function logs: `supabase functions logs generate-playlist`
-   Try using a different model in the Edge Function code

### View All Secrets

```bash
supabase secrets list
```

### Check Function Status

Go to: https://supabase.com/dashboard/project/zjgnyqdmhjpojnjsdvhp/functions

## Local Testing (Optional)

1. Create `.env.local` in supabase/functions/:

```env
OPENROUTER_API_KEY=your-key-here
```

2. Run locally:

```bash
supabase functions serve generate-playlist --env-file ./supabase/functions/.env.local
```

3. Test with curl:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/generate-playlist' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"prompt":"Happy and energetic","discoveryMode":false}'
```
