/**
 * chore-sentry-triage.yml 의 workflow_dispatch 입력을 읽고 검증합니다.
 *
 * 입력은 Vercel 웹훅 수신기가 Sentry 페이로드에서 뽑아 보낸 값이라 비신뢰 데이터입니다.
 * 워크플로는 이 값을 `env:` 로만 넘기고, 검증은 여기서 한 번 합니다.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED_PROJECT_SLUGS = ["web-memo", "web-memo-web"];
export const ALLOWED_ACTIONS = ["created", "unresolved"];
export const SENTRY_ORG_SLUG = "guesung";

const ISSUE_ID_PATTERN = /^\d{1,20}$/;
const SHORT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const SLACK_ID_PATTERN = /^[A-Za-z0-9]{1,32}$/;
const SLACK_TS_PATTERN = /^\d{1,12}\.\d{1,8}$/;

/**
 * @param {Record<string, string | undefined>} raw
 * @returns {{ ok: true, value: object } | { ok: false, errors: string[] }}
 */
export const validateInputs = (raw) => {
	const errors = [];
	const issueId = (raw.issueId ?? "").trim();
	const shortId = (raw.shortId ?? "").trim();
	const projectSlug = (raw.projectSlug ?? "").trim();
	const action = (raw.action ?? "").trim();
	const slackChannel = (raw.slackChannel ?? "").trim();
	const slackTs = (raw.slackTs ?? "").trim();

	if (!ISSUE_ID_PATTERN.test(issueId)) {
		errors.push("issue_id 는 숫자만 허용합니다");
	}
	if (shortId && !SHORT_ID_PATTERN.test(shortId)) {
		errors.push("short_id 형식이 올바르지 않습니다");
	}
	if (!ALLOWED_PROJECT_SLUGS.includes(projectSlug)) {
		errors.push(`project_slug 는 ${ALLOWED_PROJECT_SLUGS.join("|")} 만 허용합니다`);
	}
	if (!ALLOWED_ACTIONS.includes(action)) {
		errors.push(`action 은 ${ALLOWED_ACTIONS.join("|")} 만 허용합니다`);
	}
	if (slackChannel && !SLACK_ID_PATTERN.test(slackChannel)) {
		errors.push("slack_channel 형식이 올바르지 않습니다");
	}
	// ts 가 형식에 어긋나면 스레드를 못 달 뿐이라 실패 대신 비웁니다.
	const safeTs = SLACK_TS_PATTERN.test(slackTs) ? slackTs : "";

	if (errors.length > 0) return { ok: false, errors };

	return {
		ok: true,
		value: {
			issueId,
			shortId: shortId || issueId,
			projectSlug,
			action,
			slackChannel,
			slackTs: safeTs,
		},
	};
};

/** 워크플로가 env 로 넘긴 입력(ISSUE_ID 등)을 검증 전 형태로 읽습니다. */
export const readRawInputs = (env = process.env) => ({
	issueId: env.ISSUE_ID,
	shortId: env.SHORT_ID,
	projectSlug: env.PROJECT_SLUG,
	action: env.ACTION,
	slackChannel: env.SLACK_CHANNEL,
	slackTs: env.SLACK_TS,
});

export const isMainModule = (metaUrl) =>
	Boolean(process.argv[1]) && fileURLToPath(metaUrl) === resolve(process.argv[1]);
