-- 메모에 "읽는 중" 플래그 추가. 위시(isWish)·중요(isStar)와 독립된 축.
ALTER TABLE memo.memo
  ADD COLUMN IF NOT EXISTS "isReading" boolean DEFAULT false;
