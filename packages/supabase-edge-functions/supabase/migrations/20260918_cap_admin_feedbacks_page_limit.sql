-- 관리자 피드백 조회 RPC의 page_limit에 서버 상한을 건다.
-- anon/authenticated 키로도 호출 가능한 함수라 page_limit을 임의로 키워 한 번에
-- 전체 테이블을 긁어갈 수 있었다. LEAST로 100을 넘지 못하게 막는다.
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
  WHERE search_query IS NULL OR f.content ILIKE '%' || search_query || '%';

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO feedbacks_data
  FROM (
    SELECT f.id, f.content, f.user_id, f.email, f.created_at
    FROM feedback.feedbacks f
    WHERE search_query IS NULL OR f.content ILIKE '%' || search_query || '%'
    ORDER BY f.created_at DESC
    OFFSET page_offset LIMIT capped_page_limit
  ) t;

  RETURN json_build_object('data', feedbacks_data, 'count', total_count);
END;
$function$;
