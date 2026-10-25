-- 관리자 사용자 목록에 "최근 활동" 시점을 더한다.
--
-- 지금 표는 가입일과 메모 수만 보여 줘서 "가입만 하고 안 쓰는 사람"과 "지금도 쓰는 사람"을
-- 가입일로 짐작해야 한다. last_activity_at 은 그 사용자가 마지막으로 메모를 만들거나 고친
-- 시각이다.
--
-- auth.users.last_sign_in_at 을 쓰지 않는 이유: 그 값은 로그인 세션이 새로 만들어질 때만
-- 갱신된다. 웹은 세션이 오래 유지되고 확장은 저장된 세션으로 조용히 동작하므로, 매일 쓰는
-- 사람도 몇 달 전으로 찍힌다. 화면의 열 이름을 "최근 접속"이 아니라 "최근 활동"으로 둔 것도
-- 같은 이유다.
--
-- 기준을 memo.memo 의 created_at/updated_at 최댓값으로 잡으면 대시보드의 활성 사용자
-- 카드(20241208_add_active_users_stats.sql)와 세는 대상이 같아진다. "일간 활성 사용자 3명"과
-- "최근 활동이 하루 안인 사용자 3명"이 한 화면에서 일치한다.
--
-- deleted_at 은 보지 않는다. 기존 memo_count 가 이미 소프트 삭제된 메모까지 세고 있어,
-- 여기서만 제외하면 같은 행의 두 열이 다른 모수를 갖게 된다.
--
-- 검색 조건은 건드리지 않는다. 이미 nickname·email·UUID 셋을 모두 ILIKE 로 보고 있다 —
-- 화면에서 이메일 검색이 안 되던 것은 이 함수가 아니라 프론트의 끊어진 배선 탓이었다.
--
-- 이 파일은 이미 프로덕션에 적용된 변경의 기록이다.

CREATE OR REPLACE FUNCTION memo.get_admin_users(search_query text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
  users_data JSON;
  total_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memo.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT COUNT(*) INTO total_count
  FROM auth.users u
  LEFT JOIN memo.profiles p ON u.id = p.user_id
  WHERE (
    search_query IS NULL
    OR p.nickname ILIKE '%' || search_query || '%'
    OR u.email ILIKE '%' || search_query || '%'
    OR u.id::TEXT ILIKE '%' || search_query || '%'
  );

  SELECT json_agg(user_row ORDER BY user_row.created_at DESC) INTO users_data
  FROM (
    SELECT
      u.id as user_id,
      u.email,
      p.nickname,
      u.created_at,
      COALESCE(m.memo_count, 0) as memo_count,
      m.last_activity_at
    FROM auth.users u
    LEFT JOIN memo.profiles p ON u.id = p.user_id
    LEFT JOIN (
      SELECT
        user_id,
        COUNT(*) as memo_count,
        MAX(GREATEST(created_at, COALESCE(updated_at, created_at))) as last_activity_at
      FROM memo.memo
      GROUP BY user_id
    ) m ON u.id = m.user_id
    WHERE (
      search_query IS NULL
      OR p.nickname ILIKE '%' || search_query || '%'
      OR u.email ILIKE '%' || search_query || '%'
      OR u.id::TEXT ILIKE '%' || search_query || '%'
    )
    ORDER BY u.created_at DESC
  ) AS user_row;

  result := json_build_object(
    'users', COALESCE(users_data, '[]'::JSON),
    'totalCount', total_count
  );

  RETURN result;
END;
$function$;
