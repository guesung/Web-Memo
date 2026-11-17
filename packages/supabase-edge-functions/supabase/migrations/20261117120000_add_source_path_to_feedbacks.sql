-- 피드백이 어느 웹 페이지에서 보내졌는지 남기는 출처 경로.
-- 값은 웹 페이지의 pathname만(쿼리 제외)이며 클라이언트가 넣는다. 확장·앱 등 출처를 모르는 경로와
-- 기존 행은 비어 있으므로 nullable이다.
-- feedbacks에는 전체 테이블 INSERT 권한과 `WITH CHECK (true)` 정책이 있어 새 컬럼 insert를 막지 않는다.
ALTER TABLE feedback.feedbacks ADD COLUMN IF NOT EXISTS source_path text;
