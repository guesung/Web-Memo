-- 메모 휴지통: 삭제를 즉시 지우는 대신 deleted_at 타임스탬프로 표시한다.
-- 별도 trash 테이블로 옮기지 않는 이유는 복구가 UPDATE 한 번이면 끝나고,
-- 하이라이트·카테고리 관계가 끊기지 않기 때문이다.
-- 대신 조회 경로 전부에 "deleted_at is null" 필터가 필요하다. 하나라도 빠지면
-- 지운 메모가 그 화면에만 계속 보인다.
ALTER TABLE memo.memo
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz DEFAULT NULL;

-- 목록 조회는 전부 deleted_at is null로 걸리므로 부분 인덱스로 살아있는 행만 담는다.
CREATE INDEX IF NOT EXISTS memo_memo_not_deleted_idx
  ON memo.memo (user_id, updated_at DESC)
  WHERE "deleted_at" IS NULL;
