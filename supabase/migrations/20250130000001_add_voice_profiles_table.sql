-- Create voice_profiles table to store Twitter voice analysis data
CREATE TABLE IF NOT EXISTS voice_profiles (
  user_id UUID PRIMARY KEY REFERENCES users_profiles(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_id ON voice_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own voice profile" 
  ON voice_profiles 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice profile" 
  ON voice_profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice profile" 
  ON voice_profiles 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice profile" 
  ON voice_profiles 
  FOR DELETE 
  USING (auth.uid() = user_id);