# Database Setup Instructions

## Run the migration on Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the contents of `001_create_reflections.sql`
5. Paste and run the SQL

This will create:

-   `reflections` table: Stores all generated playlists with prompts, narratives, and metadata
-   `user_preferences` table: Stores user settings and Spotify tokens
-   Row Level Security policies to ensure users can only access their own data
-   Indexes for optimal query performance

## Database Schema

### reflections

-   Stores each playlist generation
-   Includes AI-generated narrative and track list
-   Tracks valence/energy for dynamic UI
-   Records context (weather, time of day, discovery mode)

### user_preferences

-   Stores Spotify OAuth tokens
-   User's default preferences
-   Weather sync settings
