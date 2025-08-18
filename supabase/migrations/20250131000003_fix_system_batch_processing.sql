-- Fix system batch processing by allowing null user_id for system operations
-- This allows the batch processor to log system-level operations without a user context

-- Make user_id nullable in processing_batches for system operations
ALTER TABLE processing_batches 
  ALTER COLUMN user_id DROP NOT NULL;

-- Make user_id nullable in api_usage_log for system operations  
ALTER TABLE api_usage_log
  ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies to handle null user_id (system operations)
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own API usage" ON api_usage_log;
DROP POLICY IF EXISTS "Users can view own processing batches" ON processing_batches;

-- Recreate policies allowing null user_id for system operations
CREATE POLICY "Users can view own API usage" ON api_usage_log 
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can view own processing batches" ON processing_batches 
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- Add comments for clarity
COMMENT ON COLUMN processing_batches.user_id IS 'User ID for user-initiated batches, NULL for system/cron batches';
COMMENT ON COLUMN api_usage_log.user_id IS 'User ID for user operations, NULL for system/cron operations';