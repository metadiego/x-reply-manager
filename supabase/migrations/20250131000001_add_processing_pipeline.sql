-- Migration: Create a function to reset daily quotas (called at midnight)
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
  
  RETURN updated_count;
END;
$$;

-- Add a comment to document the migration
COMMENT ON FUNCTION reset_daily_quotas() IS 'Resets daily quotas and counters for all users, called at midnight';