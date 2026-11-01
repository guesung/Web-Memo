-- 새 설정 행의 요약 기본값만 켠다. 기존 사용자가 저장한 OFF 값은 유지한다.
ALTER TABLE memo.setting
  ALTER COLUMN show_summary SET DEFAULT true;
