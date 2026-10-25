-- 관리자 대시보드 통계에서 관리자 본인의 데이터를 제외한다.
--
-- 메모 6,346건 중 4,237건(67%)이 만든 사람 본인의 것이고, 어제 활성 사용자 1명도 전부 본인이었다.
-- 사용자가 적은 지금은 본인의 사용이 섞이면 대시보드가 "서비스가 쓰이는가"가 아니라
-- "내가 오늘 메모를 썼는가"를 보여 준다.
--
-- 제외 기준은 UUID 하드코딩이 아니라 memo.profiles.role = 'admin' 이다. DB 안에서는 role을 알 수
-- 있으므로(GA 전송 계층과 달리 확장 제약이 없다) 관리자가 늘어도 함수를 다시 고치지 않는다.
--
-- 세 함수에 include_admin boolean DEFAULT false 를 더한다. 인자를 안 주면 관리자가 빠지고,
-- 화면의 "내 데이터 포함" 토글이 true를 넘긴다.
-- get_admin_users 는 건드리지 않는다. 사용자 목록에서 본인이 사라지면 "내 계정이 왜 없지"가 된다.
--
-- 함께 고친 것 둘.
--
-- 1) get_admin_stats 의 오늘·이번 주 메모 수에 붙어 있던 `* 3` 을 걷어냈다. 월간·분기 메모 수에는
--    곱하기가 없어, 같은 카드 줄에서 오늘·이번 주만 3배로 부풀려져 있었다.
--
-- 2) get_active_users_stats 에 관리자 권한 검사가 없었다. 다른 두 함수는 role = 'admin'을
--    확인하는데 이 함수만 빠져 있어, SECURITY DEFINER인 데다 anon에게도 EXECUTE가 열려 있어
--    누구나 DAU/WAU/MAU를 읽을 수 있었다.
--
-- 파라미터를 더하는 CREATE OR REPLACE 는 기존 함수를 덮어쓰지 않고 오버로드를 만든다. 그러면
-- 인자 없는 호출이 두 후보 사이에서 모호해져 실패하므로 기존 시그니처를 먼저 DROP 한다.
-- DROP 하면 EXECUTE 권한도 사라지므로 원래대로(anon·authenticated·service_role) 다시 부여한다.
--
-- 이 파일은 이미 프로덕션에 적용된 변경의 기록이다.
-- 롤백: 이 파일 맨 아래 주석에 변경 전 정의를 그대로 남겼다. DROP 후 그 정의로 CREATE 하면 된다.

BEGIN;

DROP FUNCTION IF EXISTS memo.get_admin_stats();
DROP FUNCTION IF EXISTS memo.get_active_users_stats();
DROP FUNCTION IF EXISTS memo.get_user_growth(integer);

CREATE FUNCTION memo.get_admin_stats(include_admin boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
  total_users INTEGER;
  total_memos INTEGER;
  today_memos INTEGER;
  weekly_memos INTEGER;
  monthly_memos INTEGER;
  quarterly_memos INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memo.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT COUNT(*) INTO total_users
  FROM auth.users u
  WHERE include_admin
     OR NOT EXISTS (
       SELECT 1 FROM memo.profiles p
       WHERE p.user_id = u.id AND p.role = 'admin'
     );

  SELECT COUNT(*) INTO total_memos
  FROM memo.memo m
  WHERE include_admin
     OR NOT EXISTS (
       SELECT 1 FROM memo.profiles p
       WHERE p.user_id = m.user_id AND p.role = 'admin'
     );

  SELECT COUNT(*) INTO today_memos
  FROM memo.memo m
  WHERE m.created_at >= CURRENT_DATE
    AND m.created_at < CURRENT_DATE + INTERVAL '1 day'
    AND (include_admin
         OR NOT EXISTS (
           SELECT 1 FROM memo.profiles p
           WHERE p.user_id = m.user_id AND p.role = 'admin'
         ));

  SELECT COUNT(*) INTO weekly_memos
  FROM memo.memo m
  WHERE m.created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND (include_admin
         OR NOT EXISTS (
           SELECT 1 FROM memo.profiles p
           WHERE p.user_id = m.user_id AND p.role = 'admin'
         ));

  SELECT COUNT(*) INTO monthly_memos
  FROM memo.memo m
  WHERE m.created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND (include_admin
         OR NOT EXISTS (
           SELECT 1 FROM memo.profiles p
           WHERE p.user_id = m.user_id AND p.role = 'admin'
         ));

  SELECT COUNT(*) INTO quarterly_memos
  FROM memo.memo m
  WHERE m.created_at >= CURRENT_DATE - INTERVAL '90 days'
    AND (include_admin
         OR NOT EXISTS (
           SELECT 1 FROM memo.profiles p
           WHERE p.user_id = m.user_id AND p.role = 'admin'
         ));

  result := json_build_object(
    'totalUsers', total_users,
    'totalMemos', total_memos,
    'todayMemos', today_memos,
    'weeklyMemos', weekly_memos,
    'monthlyMemos', monthly_memos,
    'quarterlyMemos', quarterly_memos
  );

  RETURN result;
END;
$function$;

CREATE FUNCTION memo.get_active_users_stats(include_admin boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'memo', 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memo.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT json_build_object(
    'dailyActiveUsers', (
      SELECT COUNT(DISTINCT m.user_id)
      FROM memo.memo m
      WHERE (m.created_at >= NOW() - INTERVAL '1 day'
          OR m.updated_at >= NOW() - INTERVAL '1 day')
        AND (include_admin
             OR NOT EXISTS (
               SELECT 1 FROM memo.profiles p
               WHERE p.user_id = m.user_id AND p.role = 'admin'
             ))
    ),
    'weeklyActiveUsers', (
      SELECT COUNT(DISTINCT m.user_id)
      FROM memo.memo m
      WHERE (m.created_at >= NOW() - INTERVAL '7 days'
          OR m.updated_at >= NOW() - INTERVAL '7 days')
        AND (include_admin
             OR NOT EXISTS (
               SELECT 1 FROM memo.profiles p
               WHERE p.user_id = m.user_id AND p.role = 'admin'
             ))
    ),
    'monthlyActiveUsers', (
      SELECT COUNT(DISTINCT m.user_id)
      FROM memo.memo m
      WHERE (m.created_at >= NOW() - INTERVAL '30 days'
          OR m.updated_at >= NOW() - INTERVAL '30 days')
        AND (include_admin
             OR NOT EXISTS (
               SELECT 1 FROM memo.profiles p
               WHERE p.user_id = m.user_id AND p.role = 'admin'
             ))
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE FUNCTION memo.get_user_growth(
  days_ago integer DEFAULT 30,
  include_admin boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memo.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT json_agg(
    json_build_object(
      'date', date_series::TEXT,
      'count', COALESCE(user_counts.count, 0)
    )
    ORDER BY date_series
  ) INTO result
  FROM generate_series(
    CURRENT_DATE - (days_ago || ' days')::INTERVAL,
    CURRENT_DATE,
    '1 day'::INTERVAL
  ) AS date_series
  LEFT JOIN (
    SELECT
      DATE(u.created_at) as signup_date,
      COUNT(*) as count
    FROM auth.users u
    WHERE u.created_at >= CURRENT_DATE - (days_ago || ' days')::INTERVAL
      AND (include_admin
           OR NOT EXISTS (
             SELECT 1 FROM memo.profiles p
             WHERE p.user_id = u.id AND p.role = 'admin'
           ))
    GROUP BY DATE(u.created_at)
  ) AS user_counts ON date_series = user_counts.signup_date;

  RETURN COALESCE(result, '[]'::JSON);
END;
$function$;

GRANT EXECUTE ON FUNCTION memo.get_admin_stats(boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION memo.get_active_users_stats(boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION memo.get_user_growth(integer, boolean) TO anon, authenticated, service_role;

COMMIT;

-- ============================================================================
-- 변경 전 정의 (프로덕션에서 덤프, 2026-09-19). 롤백용이며 실행되지 않는다.
-- ============================================================================
--
-- memo.get_active_users_stats
-- CREATE OR REPLACE FUNCTION memo.get_active_users_stats()
--  RETURNS json
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'memo', 'public'
-- AS $function$
-- DECLARE
--   result JSON;
-- BEGIN
--   SELECT json_build_object(
--     'dailyActiveUsers', (
--       SELECT COUNT(DISTINCT user_id)
--       FROM memo.memo
--       WHERE (created_at >= NOW() - INTERVAL '1 day')
--          OR (updated_at >= NOW() - INTERVAL '1 day')
--     ),
--     'weeklyActiveUsers', (
--       SELECT COUNT(DISTINCT user_id)
--       FROM memo.memo
--       WHERE (created_at >= NOW() - INTERVAL '7 days')
--          OR (updated_at >= NOW() - INTERVAL '7 days')
--     ),
--     'monthlyActiveUsers', (
--       SELECT COUNT(DISTINCT user_id)
--       FROM memo.memo
--       WHERE (created_at >= NOW() - INTERVAL '30 days')
--          OR (updated_at >= NOW() - INTERVAL '30 days')
--     )
--   ) INTO result;
--
--   RETURN result;
-- END;
-- $function$
-- ;
--
-- memo.get_admin_stats
-- CREATE OR REPLACE FUNCTION memo.get_admin_stats()
--  RETURNS json
--  LANGUAGE plpgsql
--  SECURITY DEFINER
-- AS $function$
--   DECLARE
--     result JSON;
--     total_users INTEGER;
--     total_memos INTEGER;
--     today_memos INTEGER;
--     weekly_memos INTEGER;
--     monthly_memos INTEGER;
--     quarterly_memos INTEGER;
--   BEGIN
--     -- Check if caller is admin
--     IF NOT EXISTS (
--       SELECT 1 FROM memo.profiles
--       WHERE user_id = auth.uid() AND role = 'admin'
--     ) THEN
--       RAISE EXCEPTION 'Unauthorized: Admin access required';
--     END IF;
--
--     -- Get total users count from auth.users
--     SELECT COUNT(*) INTO total_users
--     FROM auth.users;
--
--     -- Get total memos count
--     SELECT COUNT(*) INTO total_memos
--     FROM memo.memo;
--
--     -- Get today's memos count (x3)
--     SELECT COUNT(*) * 3 INTO today_memos
--     FROM memo.memo
--     WHERE created_at >= CURRENT_DATE
--       AND created_at < CURRENT_DATE + INTERVAL '1 day';
--
--     -- Get weekly memos count (last 7 days, x3)
--     SELECT COUNT(*) * 3 INTO weekly_memos
--     FROM memo.memo
--     WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
--
--     -- Get monthly memos count (last 30 days)
--     SELECT COUNT(*) INTO monthly_memos
--     FROM memo.memo
--     WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
--
--     -- Get quarterly memos count (last 90 days)
--     SELECT COUNT(*) INTO quarterly_memos
--     FROM memo.memo
--     WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';
--
--     -- Build result JSON
--     result := json_build_object(
--       'totalUsers', total_users,
--       'totalMemos', total_memos,
--       'todayMemos', today_memos,
--       'weeklyMemos', weekly_memos,
--       'monthlyMemos', monthly_memos,
--       'quarterlyMemos', quarterly_memos
--     );
--
--     RETURN result;
--   END;
--   $function$
-- ;
--
-- memo.get_user_growth
-- CREATE OR REPLACE FUNCTION memo.get_user_growth(days_ago integer DEFAULT 30)
--  RETURNS json
--  LANGUAGE plpgsql
--  SECURITY DEFINER
-- AS $function$
-- DECLARE
--   result JSON;
-- BEGIN
--   -- Check if caller is admin
--   IF NOT EXISTS (
--     SELECT 1 FROM memo.profiles
--     WHERE user_id = auth.uid() AND role = 'admin'
--   ) THEN
--     RAISE EXCEPTION 'Unauthorized: Admin access required';
--   END IF;
--
--   -- Get daily user growth data
--   SELECT json_agg(
--     json_build_object(
--       'date', date_series::TEXT,
--       'count', COALESCE(user_counts.count, 0)
--     )
--     ORDER BY date_series
--   ) INTO result
--   FROM generate_series(
--     CURRENT_DATE - (days_ago || ' days')::INTERVAL,
--     CURRENT_DATE,
--     '1 day'::INTERVAL
--   ) AS date_series
--   LEFT JOIN (
--     SELECT
--       DATE(created_at) as signup_date,
--       COUNT(*) as count
--     FROM auth.users
--     WHERE created_at >= CURRENT_DATE - (days_ago || ' days')::INTERVAL
--     GROUP BY DATE(created_at)
--   ) AS user_counts ON date_series = user_counts.signup_date;
--
--   RETURN COALESCE(result, '[]'::JSON);
-- END;
-- $function$
-- ;
