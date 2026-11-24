-- 피드백 Slack 알림의 옛 경로(대시보드 DB 웹훅 → Edge Function send-feedback)를 지운다. 노션 DB-1337 Phase 1 정리.
--
-- 20261123120000_route_slack_webhooks_to_api.sql이 이 트리거를 끄고 API 서버(notify_feedback_to_api)로 옮겼다.
-- 피드백·가입 알림이 API 서버로 도착하는 것을 운영에서 확인했고, Edge Function(send-feedback·
-- send-signup-slack-notification)도 함께 지운다.
--
-- 되돌릴 수 없다. 이 트리거는 대시보드에서 만든 DB 웹훅이라 정의에 Supabase 키가 들어 있어 레포에 옮겨 적지 않았다.
-- 옛 경로가 다시 필요하면 Edge Function을 git 이력에서 꺼내 배포하고 대시보드에서 DB 웹훅을 새로 만든다.
drop trigger if exists feedback on feedback.feedbacks;
