-- 메모에 "읽을 계획 날짜" 추가. 시간대 없는 날짜(클라이언트 로컬 날짜 'YYYY-MM-DD')이며,
-- 위시(isWish)·중요(isStar)·읽는 중(isReading) boolean 상태와 독립된 축.
ALTER TABLE memo.memo
  ADD COLUMN IF NOT EXISTS "plannedDate" date DEFAULT NULL;

-- 읽을 계획 탭 조회(plannedDate IS NOT NULL, plannedDate 순)용 부분 인덱스.
CREATE INDEX IF NOT EXISTS memo_user_planned_date_idx
  ON memo.memo (user_id, "plannedDate")
  WHERE "plannedDate" IS NOT NULL;
