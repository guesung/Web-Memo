-- Migration: Add active users statistics to admin dashboard
-- Description: Creates RPC function to get unique users who created or updated memos
-- in the last day, week, and month

-- Drop existing function if it exists to allow recreation
DROP FUNCTION IF EXISTS memo.get_active_users_stats();

-- Create function to get active users statistics
CREATE OR REPLACE FUNCTION memo.get_active_users_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = memo, public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'dailyActiveUsers', (
      SELECT COUNT(DISTINCT user_id)
      FROM memo.memo
      WHERE (created_at >= NOW() - INTERVAL '1 day')
         OR (updated_at >= NOW() - INTERVAL '1 day')
    ),
    'weeklyActiveUsers', (
      SELECT COUNT(DISTINCT user_id)
      FROM memo.memo
      WHERE (created_at >= NOW() - INTERVAL '7 days')
         OR (updated_at >= NOW() - INTERVAL '7 days')
    ),
    'monthlyActiveUsers', (
      SELECT COUNT(DISTINCT user_id)
      FROM memo.memo
      WHERE (created_at >= NOW() - INTERVAL '30 days')
         OR (updated_at >= NOW() - INTERVAL '30 days')
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION memo.get_active_users_stats() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION memo.get_active_users_stats() IS 'Returns count of unique users who created or updated memos in the last day, week, and month';
