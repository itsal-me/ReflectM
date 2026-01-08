-- Table for storing user vibe/personality analysis
CREATE TABLE vibe_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Personality data
  personality_type TEXT NOT NULL,
  personality_traits TEXT[] NOT NULL,
  personality_description TEXT NOT NULL,
  
  -- Metrics (stored as percentages 0-100)
  valence INTEGER NOT NULL CHECK (valence >= 0 AND valence <= 100),
  energy INTEGER NOT NULL CHECK (energy >= 0 AND energy <= 100),
  danceability INTEGER NOT NULL CHECK (danceability >= 0 AND danceability <= 100),
  acousticness INTEGER NOT NULL CHECK (acousticness >= 0 AND acousticness <= 100),
  instrumentalness INTEGER NOT NULL CHECK (instrumentalness >= 0 AND instrumentalness <= 100),
  
  -- Top tracks snapshot (stores array of track objects)
  tracks JSONB NOT NULL,
  
  -- Timestamps
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes
CREATE INDEX idx_vibe_analysis_user_id ON vibe_analysis(user_id);
CREATE INDEX idx_vibe_analysis_analyzed_at ON vibe_analysis(analyzed_at DESC);

-- Enable Row Level Security
ALTER TABLE vibe_analysis ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own vibe analysis
CREATE POLICY "Users can view own vibe analysis" 
  ON vibe_analysis FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own vibe analysis
CREATE POLICY "Users can insert own vibe analysis" 
  ON vibe_analysis FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own vibe analysis
CREATE POLICY "Users can update own vibe analysis" 
  ON vibe_analysis FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own vibe analysis
CREATE POLICY "Users can delete own vibe analysis" 
  ON vibe_analysis FOR DELETE 
  USING (auth.uid() = user_id);

-- Function to get the latest vibe analysis for a user
CREATE OR REPLACE FUNCTION get_latest_vibe_analysis(p_user_id UUID)
RETURNS SETOF vibe_analysis AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM vibe_analysis
  WHERE user_id = p_user_id
  ORDER BY analyzed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
