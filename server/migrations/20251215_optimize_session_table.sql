-- Optimize PostgreSQL session table for faster session lookups
-- This reduces the /api/session endpoint latency significantly

-- Add index on sid (session ID) - PRIMARY KEY lookup optimization
CREATE INDEX IF NOT EXISTS idx_session_sid ON session (sid);

-- Add index on expire time for efficient session expiration cleanup
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

-- Analyze the table to update query planner statistics
ANALYZE session;
