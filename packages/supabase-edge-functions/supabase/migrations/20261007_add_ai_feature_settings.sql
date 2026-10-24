-- 사이드 패널의 요약·AI 채팅 탭을 켜고 끄는 사용자 설정.
-- 메모만 쓰려는 사용자를 위해 기본은 꺼 둔다. 기존 행도 false로 채워진다.
ALTER TABLE memo.setting
  ADD COLUMN IF NOT EXISTS show_summary boolean NOT NULL DEFAULT false;
ALTER TABLE memo.setting
  ADD COLUMN IF NOT EXISTS show_ai_chat boolean NOT NULL DEFAULT false;
