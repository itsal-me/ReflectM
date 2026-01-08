# Supabase Edge Functions Setup

## Deploy the Edge Function

1. Install Supabase CLI:

```bash
npm install -g supabase
```

2. Login to Supabase:

```bash
supabase login
```

3. Link your project:

```bash
supabase link --project-ref your-project-ref
```

4. Set secrets:

```bash
supabase secrets set OPENROUTER_API_KEY=your-openrouter-api-key
```

5. Deploy the function:

```bash
supabase functions deploy generate-playlist
```

## Testing Locally

1. Start Supabase locally:

```bash
supabase start
```

2. Serve functions locally:

```bash
supabase functions serve generate-playlist --env-file .env.local
```

3. Test with curl:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/generate-playlist' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"prompt":"Rainy day vibes", "discoveryMode": false}'
```

## Function URL

After deployment, your function will be available at:

```
https://your-project-ref.supabase.co/functions/v1/generate-playlist
```
