# ReflectM Setup Guide

## 🎵 Welcome to ReflectM!

A cinematic AI-powered Spotify playlist generator that creates personalized playlists with movie-scene narratives based on your mood, weather, and time of day.

---

## 📋 Prerequisites

-   Node.js 18+ installed
-   A Supabase account ([sign up](https://supabase.com))
-   A Spotify Developer account ([sign up](https://developer.spotify.com))
-   An OpenRouter API key ([get one](https://openrouter.ai))
-   Weather: **Open-Meteo** is used (free, no API key required)

---

## 🚀 Quick Setup

### 1. Supabase Setup

1. Create a new project at [Supabase Dashboard](https://app.supabase.com)
2. Go to **Settings** → **API** and copy:
    - Project URL
    - Anon/Public key
3. Go to **SQL Editor** and run the migration:
    - Open `supabase/migrations/001_create_reflections.sql`
    - Copy and paste the SQL
    - Click **Run**

### 2. Spotify Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Fill in:
    - **App name**: ReflectM
    - **App description**: AI Playlist Generator
    - **Redirect URI**: `http://localhost:3000/auth/spotify/callback`
    - **Redirect URI** (production): `https://yourdomain.com/auth/spotify/callback`
4. Copy your **Client ID** and **Client Secret**

### 3. OpenRouter Setup

1. Go to [OpenRouter](https://openrouter.ai)
2. Sign up and get your API key from **Keys** section
3. This enables the AI (Gemma 3 27B) to generate playlists

### 4. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your credentials in `.env.local`:

```env
# Supabase (from step 1)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Spotify (from step 2)
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/spotify/callback

# OpenRouter (from step 3)
OPENROUTER_API_KEY=your-openrouter-api-key

# Weather: Using Open-Meteo (free, no API key needed)
```

### 5. Deploy Supabase Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set the OpenRouter API key as a secret
supabase secrets set OPENROUTER_API_KEY=your-openrouter-api-key

# Deploy the function
supabase functions deploy generate-playlist
```

### 6. Run the App

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎨 Features

✅ **AI-Powered Generation**: Uses Gemma 3 27B via OpenRouter  
✅ **Spotify Integration**: Creates actual playlists in your Spotify account  
✅ **Contextual Awareness**: Considers weather and time of day  
✅ **Discovery Mode**: Toggle between familiar artists and hidden gems  
✅ **Cinematic Narratives**: Every playlist comes with a 2-sentence movie scene  
✅ **Dynamic Aura**: Background colors change based on playlist mood  
✅ **History/Reflections**: Save and revisit all your generated playlists

---

## 🎭 How It Works

1. **Describe Your Mood**: Type in how you're feeling
2. **Toggle Discovery Mode**: Stay in your comfort zone or explore new artists
3. **Enable Weather Sync**: Let your local weather influence the vibe
4. **Generate**: AI creates a custom 15-20 song playlist
5. **Get Your Narrative**: Receive a cinematic 2-sentence story
6. **Open in Spotify**: Instantly add to your Spotify library

---

## 🛠️ Tech Stack

-   **Framework**: Next.js 15 (App Router)
-   **UI**: Tailwind CSS + shadcn/ui
-   **Font**: Manrope (Google Fonts)
-   **Colors**: Official Spotify palette (#1DB954)
-   **Backend**: Supabase (Auth, Database, Edge Functions)
-   **AI**: OpenRouter (Gemma 3 27B)
-   **Music**: Spotify Web API
-   **Weather**: Open-Meteo (free API)

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── generate/       # Playlist generation API
│   │   └── weather/        # Weather API proxy
│   ├── auth/
│   │   └── spotify/        # Spotify OAuth callback
│   └── dashboard/          # Main app interface
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── DashboardClient.tsx # Main dashboard logic
│   ├── DynamicAura.tsx     # Animated background
│   └── WeatherBadge.tsx    # Weather display
├── lib/
│   ├── supabase/           # Supabase clients
│   ├── spotify/            # Spotify utilities
│   └── context/            # Weather/time utilities
└── supabase/
    ├── migrations/         # Database schema
    └── functions/          # Edge Functions
```

---

## 🐛 Troubleshooting

### Build Fails

-   Ensure all environment variables are set in `.env.local`
-   The app needs valid Supabase credentials to build

### Spotify Connection Issues

-   Verify redirect URI matches exactly in Spotify Dashboard
-   Check that all required scopes are included
-   Ensure Client ID and Secret are correct

### AI Generation Fails

-   Verify OpenRouter API key is valid
-   Check Edge Function is deployed: `supabase functions list`
-   View Edge Function logs: `supabase functions logs generate-playlist`

### Weather Not Working

-   Optional feature - app works without it
-   Using Open-Meteo (free, no API key needed)
-   Ensure browser allows geolocation

---

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import repository on [Vercel](https://vercel.com)
3. Add all environment variables
4. Update Spotify redirect URI to production URL
5. Deploy!

### Important: Production Spotify Setup

After deploying, add your production redirect URI to Spotify Dashboard:

```
https://yourdomain.com/auth/spotify/callback
```

---

## 📝 License

MIT License - feel free to use this for your own projects!

---

## 🎉 Enjoy ReflectM!

Create playlists that tell stories. Let your mood become music.
