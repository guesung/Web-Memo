-- 피드백 다이얼로그가 받아둔 회신용 이메일을 실제로 저장한다.
-- 로그인 사용자의 계정 이메일이 아니라 "사용자가 직접 적은 값"이므로 nullable이고,
-- auth.users와 연결하지 않는다.
-- (이미 프로덕션에 적용된 변경이며, 이 파일은 기록용이다.)
ALTER TABLE feedback.feedbacks ADD COLUMN IF NOT EXISTS email text;
