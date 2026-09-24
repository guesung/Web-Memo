-- 기존 목록의 말줄임 표시를 유지하며 계정별로 전문 표시를 선택할 수 있게 한다.
ALTER TABLE memo.setting
  ADD COLUMN IF NOT EXISTS truncate_memo_content boolean NOT NULL DEFAULT true;
