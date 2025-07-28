-- Initial schema for X Reply Manager MVP
-- Creates all necessary tables and security policies

-- Users profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  twitter_handle TEXT,
  twitter_user_id TEXT,
  twitter_access_token TEXT, -- Will be encrypted at application level
  twitter_refresh_token TEXT, -- Will be encrypted at application level
  voice_training_samples TEXT[],
  subscription_tier TEXT DEFAULT 'free',
  daily_digest_time TIME DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User-defined monitoring targets
CREATE TABLE IF NOT EXISTS monitoring_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- user-friendly name like "AI Industry News"
  target_type TEXT NOT NULL CHECK (target_type IN ('topic', 'twitter_list')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topic-specific configuration
CREATE TABLE IF NOT EXISTS topic_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_target_id UUID REFERENCES monitoring_targets(id) ON DELETE CASCADE,
  keywords TEXT[], -- ["artificial intelligence", "machine learning"]
  hashtags TEXT[], -- ["#AI", "#MachineLearning", "#ArtificialIntelligence"]
  exclude_keywords TEXT[], -- ["crypto", "bitcoin"] to filter out
  min_engagement INTEGER DEFAULT 0, -- minimum likes + retweets + replies
  languages TEXT[] DEFAULT '{"en"}', -- language codes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT topic_targets_monitoring_target_unique UNIQUE (monitoring_target_id)
);

-- Twitter list configuration
CREATE TABLE IF NOT EXISTS twitter_list_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_target_id UUID REFERENCES monitoring_targets(id) ON DELETE CASCADE,
  twitter_list_id TEXT NOT NULL, -- Twitter's list ID
  list_name TEXT, -- cached for display
  list_owner_handle TEXT, -- cached for display
  include_retweets BOOLEAN DEFAULT FALSE,
  max_posts_per_day INTEGER DEFAULT 50, -- limit posts from this list
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT twitter_list_targets_monitoring_target_unique UNIQUE (monitoring_target_id)
);

-- Curated posts for daily digests
CREATE TABLE IF NOT EXISTS curated_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_profiles(id) ON DELETE CASCADE,
  monitoring_target_id UUID REFERENCES monitoring_targets(id), -- track source
  twitter_post_id TEXT,
  post_content TEXT,
  post_author_handle TEXT,
  post_author_id TEXT,
  post_url TEXT, -- full Twitter URL for easy access
  post_created_at TIMESTAMP WITH TIME ZONE, -- when the original post was created
  relevance_score FLOAT,
  engagement_score FLOAT,
  relationship_score FLOAT,
  total_score FLOAT, -- calculated final score
  selection_reason TEXT,
  digest_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI-generated reply suggestions
CREATE TABLE IF NOT EXISTS reply_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curated_post_id UUID REFERENCES curated_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_profiles(id) ON DELETE CASCADE,
  suggested_reply TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'edited', 'skipped', 'posted')),
  user_edited_reply TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  twitter_reply_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User processing state and cost tracking
CREATE TABLE IF NOT EXISTS user_processing_state (
  user_id UUID PRIMARY KEY REFERENCES users_profiles(id) ON DELETE CASCADE,
  daily_replies_generated INTEGER DEFAULT 0,
  daily_posts_fetched INTEGER DEFAULT 0, -- Tracks actual posts read from Twitter API
  last_processing_run TIMESTAMP WITH TIME ZONE,
  processing_status TEXT DEFAULT 'idle' CHECK (processing_status IN ('idle', 'processing', 'completed', 'error')),
  current_target_index INTEGER DEFAULT 0,
  daily_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage and cost tracking
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_profiles(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- 'twitter_posts_read', 'ai_generation'
  posts_fetched INTEGER NOT NULL DEFAULT 0, -- Primary cost metric: actual posts read from Twitter
  ai_tokens_used INTEGER DEFAULT 0, -- For AI generation operations
  estimated_cost_usd DECIMAL(10,4), -- posts_fetched * $0.0133 + tokens * token_rate
  monitoring_target_id UUID REFERENCES monitoring_targets(id),
  replies_generated INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing batches for tracking efficiency
CREATE TABLE IF NOT EXISTS processing_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_profiles(id) ON DELETE CASCADE,
  batch_type TEXT NOT NULL, -- 'scheduled', 'manual', 'backfill'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_posts_fetched INTEGER DEFAULT 0,
  total_replies_generated INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10,4),
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'stopped')),
  error_message TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_profiles_twitter_user_id ON users_profiles(twitter_user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_targets_user_id ON monitoring_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_targets_status ON monitoring_targets(status);
CREATE INDEX IF NOT EXISTS idx_curated_posts_user_id_digest_date ON curated_posts(user_id, digest_date);
CREATE INDEX IF NOT EXISTS idx_curated_posts_twitter_post_id ON curated_posts(twitter_post_id);
CREATE INDEX IF NOT EXISTS idx_reply_suggestions_user_id_status ON reply_suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_user_id_created_at ON api_usage_log(user_id, created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_list_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_processing_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_batches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own monitoring targets" ON monitoring_targets FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own topic targets" ON topic_targets FOR ALL USING (
  EXISTS (
    SELECT 1 FROM monitoring_targets 
    WHERE monitoring_targets.id = topic_targets.monitoring_target_id 
    AND monitoring_targets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own twitter list targets" ON twitter_list_targets FOR ALL USING (
  EXISTS (
    SELECT 1 FROM monitoring_targets 
    WHERE monitoring_targets.id = twitter_list_targets.monitoring_target_id 
    AND monitoring_targets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own curated posts" ON curated_posts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own reply suggestions" ON reply_suggestions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own processing state" ON user_processing_state FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own API usage" ON api_usage_log FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own processing batches" ON processing_batches FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profiles (id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_processing_state (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for tables that need updated_at
CREATE TRIGGER update_users_profiles_updated_at BEFORE UPDATE ON users_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monitoring_targets_updated_at BEFORE UPDATE ON monitoring_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_topic_targets_updated_at BEFORE UPDATE ON topic_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_twitter_list_targets_updated_at BEFORE UPDATE ON twitter_list_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reply_suggestions_updated_at BEFORE UPDATE ON reply_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_processing_state_updated_at BEFORE UPDATE ON user_processing_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();