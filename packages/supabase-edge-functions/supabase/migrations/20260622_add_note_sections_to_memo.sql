-- 메모에 "느낀 점(impression)"과 "액션 아이템(actionItem)" 섹션 텍스트 컬럼 추가.
-- 기존 자유 텍스트 memo 컬럼과 독립된 고정 섹션. 둘 다 nullable.
ALTER TABLE memo.memo
  ADD COLUMN IF NOT EXISTS "impression" text;
ALTER TABLE memo.memo
  ADD COLUMN IF NOT EXISTS "actionItem" text;
