-- 피드백 다이얼로그가 받아둔 회신용 이메일을 실제로 저장한다.
-- 로그인 사용자의 계정 이메일이 아니라 "사용자가 직접 적은 값"이므로 nullable이고,
-- auth.users와 연결하지 않는다.
-- (이미 프로덕션에 적용된 변경이며, 이 파일은 기록용이다.)
ALTER TABLE feedback.feedbacks ADD COLUMN IF NOT EXISTS email text;

-- 관리자 화면의 피드백 조회 RPC.
-- feedback.feedbacks에는 INSERT 정책만 있고 SELECT 정책이 없다. anon key는 클라이언트 번들에
-- 실리므로 SELECT를 열 수 없어, 관리자 판정을 함수 안에서 하는 SECURITY DEFINER 함수로만 읽는다.
-- (이미 프로덕션에 적용된 변경이며, 이 파일은 기록용이다.)

DROP FUNCTION IF EXISTS memo.get_admin_feedbacks(text, integer, integer);

CREATE OR REPLACE FUNCTION memo.get_admin_feedbacks(
  search_query text DEFAULT NULL,
  page_offset integer DEFAULT 0,
  page_limit integer DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = memo, feedback, public
AS $$
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
    'data', COALESCE((
      SELECT json_agg(row_to_json(rows))
      FROM (
        SELECT id, content, user_id, email, created_at
        FROM feedback.feedbacks
        WHERE search_query IS NULL OR content ILIKE '%' || search_query || '%'
        ORDER BY created_at DESC
        OFFSET page_offset
        LIMIT page_limit
      ) rows
    ), '[]'::json),
    'count', (
      SELECT COUNT(*)
      FROM feedback.feedbacks
      WHERE search_query IS NULL OR content ILIKE '%' || search_query || '%'
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION memo.get_admin_feedbacks(text, integer, integer) TO authenticated;

COMMENT ON FUNCTION memo.get_admin_feedbacks(text, integer, integer) IS 'Returns a page of feedbacks with the total count. Admin only.';

DROP FUNCTION IF EXISTS memo.get_admin_feedback(bigint);

CREATE OR REPLACE FUNCTION memo.get_admin_feedback(feedback_id bigint)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = memo, feedback, public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memo.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT row_to_json(rows) INTO result
  FROM (
    SELECT id, content, user_id, email, created_at
    FROM feedback.feedbacks
    WHERE id = feedback_id
  ) rows;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION memo.get_admin_feedback(bigint) TO authenticated;

COMMENT ON FUNCTION memo.get_admin_feedback(bigint) IS 'Returns a single feedback by id, or null. Admin only.';
