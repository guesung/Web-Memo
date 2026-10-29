import type { IFSentryEventContext } from "./eventContext";
import { sanitizeForSlack } from "./eventContext";
import type { IFSentryIssueWebhookPayload } from "./request";

/** Slack text 상한(4000자 한도에 여유를 둠). */
export const SLACK_TEXT_LIMIT = 3500;

const NOT_COLLECTED = "미수집";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** ISO 시각을 `YYYY-MM-DD HH:mm KST`로 바꿉니다. 해석할 수 없으면 null. */
const formatKst = (iso?: string): string | null => {
	if (!iso) return null;

	const time = new Date(iso).getTime();

	if (Number.isNaN(time)) return null;

	return `${new Date(time + KST_OFFSET_MS).toISOString().slice(0, 16).replace("T", " ")} KST`;
};

const ACTION_LABEL: Record<string, string> = {
	created: "🆕 신규",
	unresolved: "🔁 재발",
};

/** 본문만 잘라 마지막 링크는 항상 남깁니다. */
const truncate = (body: string, link?: string): string => {
	const tail = link ? `\n${link}` : "";
	const limit = SLACK_TEXT_LIMIT - tail.length;
	const head = body.length > limit ? `${body.slice(0, limit - 1)}…` : body;

	return `${head}${tail}`;
};

/**
 * Sentry 웹훅 페이로드(와 조회에 성공했다면 대표 이벤트 요약)를 Slack 메시지로 바꿉니다.
 *
 * @description 이벤트 조회가 실패해도 웹훅 필드만으로 메시지가 나갑니다. 수집하지 못한
 * 값은 0이나 production으로 추정하지 않고 `미수집`으로 적거나 줄을 생략합니다.
 * 발생 횟수·영향 사용자 수는 웹훅 수신 시점의 값입니다.
 */
export const formatSentryAlertText = (
	payload: IFSentryIssueWebhookPayload,
	eventContext?: IFSentryEventContext | null,
): string => {
	const issue = payload.data?.issue;
	const title = sanitizeForSlack(
		issue?.title ?? issue?.shortId ?? "제목 없는 이슈",
	);
	const actionLabel = ACTION_LABEL[payload.action] ?? payload.action;

	const tagEntries = issue?.tags ?? [];
	const relevantTagKeys = ["feature", "operation", "stage"];
	const tagLine = tagEntries
		.filter(([key]) => relevantTagKeys.includes(key))
		.map(([key, value]) => sanitizeForSlack(`${key}=${value}`))
		.join(" ");

	const runtime = eventContext?.runtime ?? null;
	const summaryLine = [
		`프로젝트 ${sanitizeForSlack(issue?.project?.slug ?? NOT_COLLECTED)}`,
		`runtime ${runtime ?? NOT_COLLECTED}`,
		`level ${sanitizeForSlack(issue?.level ?? NOT_COLLECTED)}`,
	].join(" · ");

	const envLine = eventContext
		? `environment ${eventContext.environment ?? NOT_COLLECTED} · release ${eventContext.release ?? NOT_COLLECTED}`
		: null;
	const clientLine = eventContext
		? `브라우저 ${eventContext.browser ?? NOT_COLLECTED} · OS ${eventContext.os ?? NOT_COLLECTED}`
		: null;

	const count = issue?.count !== undefined ? String(issue.count) : null;
	const statsLine = `발생 ${count ?? NOT_COLLECTED}회 · 영향 사용자 ${issue?.userCount ?? NOT_COLLECTED}명 (웹훅 수신 시점 값)`;

	const first = formatKst(issue?.firstSeen);
	const last = formatKst(issue?.lastSeen);
	const periodLine =
		first || last
			? `관측 기간 ${first ?? NOT_COLLECTED} ~ ${last ?? NOT_COLLECTED}`
			: null;

	const idLine = [
		issue?.shortId && `shortId ${sanitizeForSlack(issue.shortId)}`,
		issue?.id && `issue ID ${sanitizeForSlack(issue.id)}`,
	]
		.filter(Boolean)
		.join(" · ");

	const eventLines = eventContext
		? [
				`대표 이벤트 ${eventContext.eventId ?? NOT_COLLECTED} (알림 유발 이벤트와 다를 수 있음) · 조회 ${formatKst(eventContext.fetchedAt) ?? NOT_COLLECTED}`,
				eventContext.exception && `예외: ${eventContext.exception}`,
				eventContext.frames.length > 0 &&
					`상위 프레임:\n${eventContext.frames.map((frame) => `• ${frame}`).join("\n")}`,
				eventContext.breadcrumbs.length > 0 &&
					`최근 breadcrumb:\n${eventContext.breadcrumbs.map((crumb) => `• ${crumb}`).join("\n")}`,
			]
		: [];

	const lines = [
		`${actionLabel} 🚨 *${title}*`,
		tagLine,
		summaryLine,
		envLine,
		clientLine,
		statsLine,
		periodLine,
		idLine,
		issue?.culprit ? sanitizeForSlack(issue.culprit) : null,
		...eventLines,
	].filter((line): line is string => Boolean(line));

	return truncate(lines.join("\n"), issue?.permalink);
};
