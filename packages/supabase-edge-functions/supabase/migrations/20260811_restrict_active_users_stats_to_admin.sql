-- 관리자 통계 RPC(get_active_users_stats)가 모든 로그인 사용자에게 열려 있던 것을
-- 관리자(profiles.role = 'admin')만 호출할 수 있도록 제한한다.
-- UI는 admin 레이아웃에서 막고 있었지만, DB 권한이 열려 있어 anon key + 로그인 토큰만으로
-- DAU/WAU/MAU를 직접 조회할 수 있었다.
CREATE OR REPLACE FUNCTION memo.get_active_users_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = memo, public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM memo.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'permission denied: admin only';
  END IF;

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

COMMENT ON FUNCTION memo.get_active_users_stats() IS 'Returns count of unique users who created or updated memos in the last day, week, and month. Admin only.';
