-- 피드백 목록에서 언인스톨 페이지 방문 기록을 제외한다.
--
-- feedback.feedbacks 에는 사람이 쓴 글이 아닌 행이 276건 섞여 있다. 확장 삭제 시 뜨던
-- 언인스톨 페이지가 /api/uninstall-log 로 남기던 방문 기록이며, content 가
-- {"type":"uninstall_page_visit","timestamp":"..."} 뿐이라 읽을 것이 없다. 그 페이지와
-- 라우트는 2026-09-08 커밋 31b266994(PR #474)에서 제거돼 더 쌓이지 않는다.
--
-- 같은 테이블의 {"type":"uninstall",...} 55건은 거르지 않는다. 생김새는 같은 JSON이지만
-- 확장을 지운 사람이 고른 이탈 사유와 직접 쓴 문장이 들어 있어, 이 테이블에서 가장 값진
-- 자료다. content 모양으로 거르면 이쪽까지 사라지므로 타입 문자열로 잡는다.
--
-- WHERE 두 곳(건수용·본문용)에 같은 조건을 건다. 한쪽만 고치면 "총 N건"과 실제 행 수가
-- 어긋나 페이지네이션이 무너진다. 단건 조회 memo.get_admin_feedback 에는 걸지 않는다 —
-- 슬랙 알림의 ?id= 링크가 걸러진 행을 가리킬 때 조용히 죽는다.
--
-- content IS NULL 을 따로 살려 둔다. NULL NOT LIKE ... 는 NULL 이라 조건이 거짓이 되고,
-- 내용이 빈 행이 아무 말 없이 목록에서 사라진다.
--
-- 20260918_cap_admin_feedbacks_page_limit.sql 의 page_limit 상한을 여기에 그대로 들고
-- 온다. 그 파일은 레포에 있지만 프로덕션 함수 정의에는 반영돼 있지 않았다. 이 함수를
-- CREATE OR REPLACE 로 덮어쓰면서 상한을 빠뜨리면 그 수정이 영영 유실된다.
--
-- 이 파일은 이미 프로덕션에 적용된 변경의 기록이다.

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
  capped_page_limit integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memo.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  capped_page_limit := LEAST(page_limit, 100);

  SELECT COUNT(*) INTO total_count
  FROM feedback.feedbacks f
  WHERE (f.content IS NULL OR f.content NOT LIKE '{"type":"uninstall_page_visit"%')
    AND (search_query IS NULL OR f.content ILIKE '%' || search_query || '%');

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO feedbacks_data
  FROM (
    SELECT f.id, f.content, f.user_id, f.email, f.created_at
    FROM feedback.feedbacks f
    WHERE (f.content IS NULL OR f.content NOT LIKE '{"type":"uninstall_page_visit"%')
      AND (search_query IS NULL OR f.content ILIKE '%' || search_query || '%')
    ORDER BY f.created_at DESC
    OFFSET page_offset LIMIT capped_page_limit
  ) t;

  RETURN json_build_object('data', feedbacks_data, 'count', total_count);
END;
$function$;
