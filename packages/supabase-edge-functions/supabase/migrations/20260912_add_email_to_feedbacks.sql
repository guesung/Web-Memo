-- 피드백 다이얼로그가 받아둔 회신용 이메일을 실제로 저장한다.
-- 로그인 사용자의 계정 이메일이 아니라 "사용자가 직접 적은 값"이므로 nullable이고,
-- auth.users와 연결하지 않는다.
-- (이미 프로덕션에 적용된 변경이며, 이 파일은 기록용이다.)
ALTER TABLE feedback.feedbacks ADD COLUMN IF NOT EXISTS email text;

-- 관리자 화면의 피드백 조회 RPC.
-- feedback.feedbacks에는 INSERT 정책만 있고 SELECT 정책이 없다. anon key는 클라이언트 번들에
-- 실리므로 SELECT를 열 수 없어, 관리자 판정을 함수 안에서 하는 SECURITY DEFINER 함수로만 읽는다.
-- memo.get_admin_users와 같은 패턴이다.
-- (이미 프로덕션에 적용된 변경이며, 이 파일은 기록용이다. 아래는 실제 실행된 원문이다.)

CREATE OR REPLACE FUNCTION memo.get_admin_feedbacks(
  search_query text DEFAULT NULL,
  page_offset integer DEFAULT 0,
  page_limit integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = memo, feedback, public
AS $function$
DECLARE
  feedbacks_data json;
  total_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memo.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT COUNT(*) INTO total_count
  FROM feedback.feedbacks f
  WHERE search_query IS NULL OR f.content ILIKE '%' || search_query || '%';

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO feedbacks_data
  FROM (
    SELECT f.id, f.content, f.user_id, f.email, f.created_at
    FROM feedback.feedbacks f
    WHERE search_query IS NULL OR f.content ILIKE '%' || search_query || '%'
    ORDER BY f.created_at DESC
    OFFSET page_offset LIMIT page_limit
  ) t;

  RETURN json_build_object('data', feedbacks_data, 'count', total_count);
END;
$function$;

CREATE OR REPLACE FUNCTION memo.get_admin_feedback(feedback_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = memo, feedback, public
AS $function$
DECLARE
  feedback_data json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memo.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT row_to_json(t) INTO feedback_data
  FROM (
    SELECT f.id, f.content, f.user_id, f.email, f.created_at
    FROM feedback.feedbacks f
    WHERE f.id = feedback_id
  ) t;

  RETURN feedback_data;
END;
$function$;

GRANT EXECUTE ON FUNCTION memo.get_admin_feedbacks(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION memo.get_admin_feedback(bigint) TO authenticated;
