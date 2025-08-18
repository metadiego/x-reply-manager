-- Migration: Fix fetch_size to meet Twitter API minimum requirements
-- Twitter API requires max_results to be between 10 and 100

-- Add a check constraint to ensure fetch_size stays within Twitter API limits
ALTER TABLE user_processing_state 
ADD CONSTRAINT check_fetch_size_range 
CHECK (fetch_size >= 10 AND fetch_size <= 100);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT check_fetch_size_range ON user_processing_state IS 
'Ensures fetch_size is within Twitter API limits (10-100)';