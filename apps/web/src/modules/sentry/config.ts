import { readServerEnv, requireServerEnv } from "@src/utils/serverEnv";

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

/**
 * 이슈의 대표 이벤트를 조회하는 Sentry API 토큰(`event:read`).
 * 없으면 이벤트 조회를 건너뛰고 웹훅 필드만으로 알림을 보냅니다.
 */
export const getSentryApiToken = (): string | undefined =>
	readServerEnv("SENTRY_API_TOKEN");

/**
 * AI 분석 워크플로 디스패치 킬 스위치. 정확히 "true"일 때만 켜집니다.
 * 기본은 꺼짐이며, 끄면 Slack 알림은 그대로 가고 디스패치만 멈춥니다.
 */
export const isSentryAiTriageEnabled = (): boolean =>
	readServerEnv("SENTRY_AI_TRIAGE_ENABLED") === "true";
