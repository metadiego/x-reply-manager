-- Fix search cache access for system operations
-- The search cache is used by the batch processor running with service role

-- Enable RLS on search_cache table (if not already enabled)
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
-- Service role bypasses RLS by default, but we'll add explicit policies for clarity

-- Allow all operations for service role (which bypasses RLS anyway)
-- These policies ensure that if RLS is enforced in the future, the system will still work

-- Allow anyone to read from cache (it's public data)
CREATE POLICY "Anyone can read search cache" 
  ON search_cache 
  FOR SELECT 
  USING (true);

-- Allow anyone to insert to cache
CREATE POLICY "Anyone can insert to search cache" 
  ON search_cache 
  FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to update cache (for upsert operations)
CREATE POLICY "Anyone can update search cache" 
  ON search_cache 
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Allow anyone to delete expired cache entries
CREATE POLICY "Anyone can delete expired cache" 
  ON search_cache 
  FOR DELETE 
  USING (expires_at < NOW());

-- Add comment explaining the cache purpose
COMMENT ON TABLE search_cache IS 'Shared cache for Twitter API search results to reduce API costs - accessible to all for read/write';