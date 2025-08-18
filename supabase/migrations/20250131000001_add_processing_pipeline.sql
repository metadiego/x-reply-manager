-- Migration: Add processing pipeline support for smart tweet fetching
-- This migration adds support for the Search Broker caching system and
-- enhanced user processing state management for the batch processing pipeline.

-- Extend user_processing_state table with additional columns for processing pipeline
ALTER TABLE user_processing_state ADD COLUMN IF NOT EXISTS
  replies_left_today INTEGER DEFAULT 10;

ALTER TABLE user_processing_state ADD COLUMN IF NOT EXISTS
  last_served_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_processing_state ADD COLUMN IF NOT EXISTS
  current_target_index INTEGER DEFAULT 0;

ALTER TABLE user_processing_state ADD COLUMN IF NOT EXISTS
  fetch_size INTEGER DEFAULT 10;

ALTER TABLE user_processing_state ADD COLUMN IF NOT EXISTS
  successful_fetch_rate FLOAT DEFAULT 0.5;

-- Create search cache table for the Search Broker
CREATE TABLE IF NOT EXISTS search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_query TEXT NOT NULL,
  query_type TEXT NOT NULL CHECK (query_type IN ('hashtag', 'keyword', 'combined')),
  raw_results JSONB NOT NULL,
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '5 minutes',
  
  -- Ensure unique queries for caching
  UNIQUE(canonical_query, query_type)
);

-- Add tracking columns to monitoring_targets for processing optimization
ALTER TABLE monitoring_targets ADD COLUMN IF NOT EXISTS
  last_fetched_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE monitoring_targets ADD COLUMN IF NOT EXISTS
  fetch_count_today INTEGER DEFAULT 0;

ALTER TABLE monitoring_targets ADD COLUMN IF NOT EXISTS
  successful_fetches INTEGER DEFAULT 0;

ALTER TABLE monitoring_targets ADD COLUMN IF NOT EXISTS
  total_fetches INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_cache_canonical_query 
  ON search_cache(canonical_query);

CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at 
  ON search_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_processing_state_last_served 
  ON user_processing_state(last_served_at);

CREATE INDEX IF NOT EXISTS idx_user_processing_state_replies_left 
  ON user_processing_state(replies_left_today);

CREATE INDEX IF NOT EXISTS idx_monitoring_targets_last_fetched 
  ON monitoring_targets(last_fetched_at);

-- Enable Row Level Security for search_cache
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for search_cache
-- Note: Search cache is shared across users to optimize costs,
-- so we allow all authenticated users to read cached results
CREATE POLICY "Authenticated users can view search cache" 
  ON search_cache 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Only the system can insert/update cache entries (via service role)
CREATE POLICY "Service role can manage search cache" 
  ON search_cache 
  FOR ALL 
  TO service_role 
  USING (true);

-- Create a function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_search_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM search_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Create a function to reset daily quotas (called at midnight)
CREATE OR REPLACE FUNCTION reset_daily_quotas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Reset user processing state for new day
  UPDATE user_processing_state 
  SET 
    replies_left_today = 10, -- TODO: Make this based on subscription tier
    daily_replies_generated = 0,
    daily_posts_fetched = 0,
    daily_reset_at = CURRENT_DATE + INTERVAL '1 day'
  WHERE daily_reset_at <= NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Reset monitoring targets daily counters
  UPDATE monitoring_targets 
  SET 
    fetch_count_today = 0;
  
  -- Clean expired cache
  PERFORM clean_expired_search_cache();
  
  RETURN updated_count;
END;
$$;

-- Add some helpful indexes for the processing pipeline
CREATE INDEX IF NOT EXISTS idx_monitoring_targets_user_status 
  ON monitoring_targets(user_id, status) 
  WHERE status = 'active';

-- Add a comment to document the migration
COMMENT ON TABLE search_cache IS 'Caches Twitter search results to optimize API usage across multiple users with shared interests';
COMMENT ON COLUMN search_cache.canonical_query IS 'Normalized query string for consistent caching';
COMMENT ON COLUMN search_cache.raw_results IS 'Raw tweet data from Twitter API stored as JSONB';
COMMENT ON FUNCTION clean_expired_search_cache() IS 'Removes expired cache entries to keep table size manageable';
COMMENT ON FUNCTION reset_daily_quotas() IS 'Resets daily quotas and counters for all users, called at midnight';