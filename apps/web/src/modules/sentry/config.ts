import { requireServerEnv } from "@src/utils/serverEnv";

/**
 * Sentry 웹훅 릴레이에 필요한 서버 전용 설정.
 *
 * @description Slack 유료 알림 대신, Sentry Internal Integration의 무료 웹훅을
 * 받아 기존 Slack 봇 인프라로 포워딩합니다({@link ../slack}). 이 값들은 서명 검증에
 * 쓰이므로 GitHub PAT·Slack 시크릿과 같은 이유로 `@web-memo/env`의 CONFIG가 아니라
 * Vercel 환경변수를 서버에서만 직접 읽습니다.
 */

/** Sentry Internal Integration의 Client Secret. 웹훅 서명 검증에 씁니다. */
export const getSentryWebhookSecret = (): string =>
	requireServerEnv("SENTRY_WEBHOOK_SECRET");

/** Sentry 알림을 릴레이할 Slack 채널(ID 또는 이름). */
export const getSentryAlertSlackChannel = (): string =>
	requireServerEnv("SLACK_SENTRY_ALERT_CHANNEL");
