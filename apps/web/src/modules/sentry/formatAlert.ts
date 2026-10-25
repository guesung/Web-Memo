import type { IFSentryIssueWebhookPayload } from "./request";

/**
 * Sentry 웹훅 페이로드를 Slack 메시지 텍스트로 바꿉니다.
 *
 * @description `tags`는 `[key, value]` 튜플 배열로 오므로, feature/operation/stage
 * 태그가 있으면 한 줄로 뽑아 붙입니다. 없으면 제목·링크만 보냅니다.
 */
export const formatSentryAlertText = (
	payload: IFSentryIssueWebhookPayload,
): string => {
	const issue = payload.data?.issue;
	const title = issue?.title ?? issue?.shortId ?? "제목 없는 이슈";
	const link = issue?.permalink;

	const tagEntries = issue?.tags ?? [];
	const relevantTagKeys = ["feature", "operation", "stage"];
	const relevantTags = tagEntries.filter(([key]) =>
		relevantTagKeys.includes(key),
	);
	const tagLine = relevantTags.length
		? relevantTags.map(([key, value]) => `${key}=${value}`).join(" ")
		: null;

	const lines = [`🚨 *${title}*`, tagLine, issue?.culprit, link].filter(
		(line): line is string => Boolean(line),
	);

	return lines.join("\n");
};
