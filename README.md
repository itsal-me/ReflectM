# ReflectM 🎵✨

**AI-Powered Spotify Playlist Generator with Cinematic Narratives**

Transform your mood into music. ReflectM uses AI to create personalized Spotify playlists with movie-scene narratives, influenced by your feelings, weather, and time of day.

## ✨ Features

-   🤖 **AI-Generated Playlists**: Gemma 3 27B creates custom 15-20 song playlists
-   🎬 **Cinematic Narratives**: Each playlist includes a 2-sentence movie scene story
-   🌦️ **Weather-Aware**: Automatically uses Open-Meteo (free weather API)
-   ⏰ **Time-Conscious**: Adapts to morning, afternoon, evening, or night vibes
-   🔍 **Discovery Toggle**: Choose between familiar favorites or hidden gems
-   🎨 **Dynamic Aura**: Background morphs with playlist mood (valence/energy)
-   📚 **Reflections**: Save and revisit your playlist history
-   🎵 **Spotify OAuth**: One-click login with Spotify - no passwords needed
-   💎 **Professional Design**: Clean Spotify-themed interface with Manrope font

## 🔐 Authentication

**ReflectM uses Spotify OAuth as the ONLY authentication method.**

-   ✅ One-click login with Spotify
-   ✅ No email/password forms
-   ✅ No email confirmation required
-   ✅ Seamless Spotify integration

See [SPOTIFY_AUTH.md](SPOTIFY_AUTH.md) for detailed authentication documentation.

## Getting Started

**📖 See [SETUP.md](SETUP.md) for detailed setup instructions**

### Prerequisites

-   Node.js 18+ installed
-   A Supabase account and project
-   **Spotify Developer account** (for OAuth)
-   OpenRouter API key (for AI)
-   Weather: **Open-Meteo** (free, no API key needed)

### Setup

1. **Configure Environment Variables**

    Copy the `.env.example` file to `.env.local` and add your Supabase credentials:

    ```bash
    cp .env.example .env.local
    ```

    Update the values in `.env.local`:

    ```
    NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
    ```

    You can find these values in your [Supabase Dashboard](https://app.supabase.com) under Project Settings > API.

2. **Run Development Server**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
├── app/
│   ├── auth/callback/      # Auth callback handler
│   ├── dashboard/          # Protected dashboard page
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   └── page.tsx            # Home page
├── components/auth/        # Authentication components
├── lib/
│   ├── supabase/          # Supabase client configurations
│   └── db/                # Database query utilities
└── middleware.ts          # Next.js middleware for auth
```

## Authentication Flow

1. **Sign Up**: Users create an account at `/signup`
2. **Email Confirmation**: Users receive a confirmation email
3. **Login**: Users login at `/login`
4. **Protected Routes**: Dashboard at `/dashboard` requires authentication
5. **Logout**: Users can logout from the dashboard

## Database Usage

Utility functions for database operations are in `lib/db/queries.ts`:

```typescript
import { getTableData } from "@/lib/db/queries";

// In a Server Component
const data = await getTableData("your_table_name");
```

## Supabase Setup

1. Create a new project at [Supabase](https://app.supabase.com)
2. Enable Email authentication in Authentication > Providers
3. Create your database tables
4. Copy your project URL and anon key to `.env.local`

## Learn More

-   [Next.js Documentation](https://nextjs.org/docs)
-   [Supabase Documentation](https://supabase.com/docs)
