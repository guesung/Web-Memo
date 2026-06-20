-- 메모에 "중요(별표)" 플래그 추가. 위시리스트(isWish)와 독립된 축.
ALTER TABLE memo.memo
  ADD COLUMN IF NOT EXISTS "isStar" boolean DEFAULT false;
