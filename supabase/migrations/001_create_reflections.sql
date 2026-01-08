-- ReflectM Database Schema

-- Table for storing user reflections/history
CREATE TABLE reflections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  playlist_name TEXT NOT NULL,
  narrative TEXT NOT NULL,
  spotify_playlist_id TEXT,
  spotify_playlist_url TEXT,
  valence DECIMAL(3, 2),
  energy DECIMAL(3, 2),
  discovery_mode BOOLEAN DEFAULT false,
  weather_condition TEXT,
  time_of_day TEXT,
  tracks JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Index for faster user queries
CREATE INDEX idx_reflections_user_id ON reflections(user_id);
CREATE INDEX idx_reflections_created_at ON reflections(created_at DESC);

-- Enable Row Level Security
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own reflections
CREATE POLICY "Users can view own reflections" 
  ON reflections FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own reflections
CREATE POLICY "Users can insert own reflections" 
  ON reflections FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own reflections
CREATE POLICY "Users can delete own reflections" 
  ON reflections FOR DELETE 
  USING (auth.uid() = user_id);

-- Table for storing user preferences
CREATE TABLE user_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  default_discovery_mode BOOLEAN DEFAULT false,
  weather_sync_enabled BOOLEAN DEFAULT true,
  spotify_access_token TEXT,
  spotify_refresh_token TEXT,
  spotify_token_expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own preferences
CREATE POLICY "Users can view own preferences" 
  ON user_preferences FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can only update their own preferences
CREATE POLICY "Users can update own preferences" 
  ON user_preferences FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" 
  ON user_preferences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
