-- Create rate_limits table for atomic rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 0,
  reset_time BIGINT NOT NULL, -- Unix timestamp in milliseconds
  blocked_until BIGINT, -- Unix timestamp in milliseconds, null if not blocked
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_time ON rate_limits(reset_time);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until ON rate_limits(blocked_until);

-- Create RLS policies (restrict to authenticated users only)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access rate limits for operations they perform
-- (This will be enforced at the application level)
CREATE POLICY "Rate limits are managed by the system" ON rate_limits
  FOR ALL USING (false); -- No direct access, only through functions

-- Grant permissions to authenticated users through the service role
-- (Rate limiting should only be done server-side)

-- Create function to clean up expired rate limit entries
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete entries that are expired and not blocked, or blocked entries that have expired
  DELETE FROM rate_limits 
  WHERE (reset_time < EXTRACT(EPOCH FROM NOW()) * 1000 AND blocked_until IS NULL)
     OR (blocked_until IS NOT NULL AND blocked_until < EXTRACT(EPOCH FROM NOW()) * 1000);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for cleanup function
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup 
ON rate_limits(reset_time, blocked_until) 
WHERE blocked_until IS NULL OR blocked_until IS NOT NULL;

COMMENT ON TABLE rate_limits IS 'Atomic rate limiting with race condition protection';
COMMENT ON COLUMN rate_limits.key IS 'Unique identifier for the rate limit (e.g., sms:user_id)';
COMMENT ON COLUMN rate_limits.count IS 'Current request count within the window';
COMMENT ON COLUMN rate_limits.reset_time IS 'When the rate limit window resets (Unix timestamp in ms)';
COMMENT ON COLUMN rate_limits.blocked_until IS 'When the block expires (Unix timestamp in ms), null if not blocked';
COMMENT ON FUNCTION cleanup_expired_rate_limits() IS 'Removes expired rate limit entries to prevent table bloat';