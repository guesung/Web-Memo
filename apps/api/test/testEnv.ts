/** 테스트에서 쓰는 가짜 환경 변수. validateEnv를 통과하는 형식만 맞춘다 */
export const TEST_ENV = {
	WEBHOOK_SECRET: "test-webhook-secret-0123456789abcdef",
	SLACK_FEEDBACK_WEBHOOK_URL: "https://hooks.slack.test/feedback",
	SLACK_SIGNUP_WEBHOOK_URL: "https://hooks.slack.test/signup",
	WEB_URL: "https://www.webmemo.test",
	// 테스트는 PrismaService를 가짜로 바꾸므로 이 주소로 실제 연결하지 않는다
	DATABASE_URL: "postgresql://api:password@localhost:5432/postgres",
	UNSUBSCRIBE_SECRET: "test-unsubscribe-secret-0123456789abcdef",
};
