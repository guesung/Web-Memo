import { postSlackMessage } from "../slack/api";
import { GITHUB_DEFAULT_BRANCH, GITHUB_REPOSITORY } from "../slack/config";
import { buildHeaders, GITHUB_API_ORIGIN } from "../slack/githubApi";
import { isSentryAiTriageEnabled } from "./config";
import type { IFSentryIssueWebhookPayload } from "./request";

const TRIAGE_WORKFLOW_FILE = "chore-sentry-triage.yml";

/** 분석 대상으로 허용하는 Sentry 프로젝트. 조직 밖·다른 프로젝트 이슈는 거르는 검증입니다. */
const ALLOWED_PROJECT_SLUGS = ["web-memo", "web-memo-web"];

const DISPATCH_FAILURE_REPLY = "AI 분석을 시작하지 못했습니다";

/**
 * 킬 스위치가 켜져 있을 때만 AI 분석 워크플로를 실행합니다.
 *
 * @description `GITHUB_DISPATCH_TOKEN`은 이 Vercel 서버에서 dispatch 호출에만 쓰이고
 * 워크플로나 AI에는 전달되지 않습니다. 입력 계약(전부 string)은 워크플로와 고정입니다:
 * issue_id · short_id · project_slug · action · slack_channel · slack_ts.
 *
 * 어떤 실패도 던지지 않습니다. 원본 알림은 이미 나간 뒤이므로 영향을 받으면 안 됩니다.
 */
export const dispatchSentryTriage = async ({
	payload,
	slack,
}: {
	payload: IFSentryIssueWebhookPayload;
	slack: { channel: string; ts: string };
}): Promise<void> => {
	if (!isSentryAiTriageEnabled()) return;

	const issue = payload.data?.issue;
	const issueId = issue?.id;
	const projectSlug = issue?.project?.slug;

	if (!issueId || !/^\d+$/.test(issueId)) {
		console.error("Sentry AI 분석 디스패치 건너뜀: issue id가 숫자가 아닙니다");

		return;
	}

	if (!projectSlug || !ALLOWED_PROJECT_SLUGS.includes(projectSlug)) {
		console.error(
			`Sentry AI 분석 디스패치 건너뜀: 허용되지 않은 프로젝트(${projectSlug})`,
		);

		return;
	}

	try {
		const response = await fetch(
			`${GITHUB_API_ORIGIN}/repos/${GITHUB_REPOSITORY}/actions/workflows/${TRIAGE_WORKFLOW_FILE}/dispatches`,
			{
				method: "POST",
				headers: buildHeaders(),
				body: JSON.stringify({
					ref: GITHUB_DEFAULT_BRANCH,
					inputs: {
						issue_id: issueId,
						short_id: issue?.shortId ?? "",
						project_slug: projectSlug,
						action: payload.action,
						slack_channel: slack.channel,
						slack_ts: slack.ts,
					},
				}),
			},
		);

		if (!response.ok) {
			throw new Error(
				`${TRIAGE_WORKFLOW_FILE} 실행 실패: ${response.status} ${(await response.text()).slice(0, 200)}`,
			);
		}
	} catch (error) {
		console.error("Sentry AI 분석 워크플로 디스패치 실패:", error);

		try {
			await postSlackMessage({
				channel: slack.channel,
				text: DISPATCH_FAILURE_REPLY,
				threadTs: slack.ts,
			});
		} catch (replyError) {
			console.error("AI 분석 실패 스레드 답글 전송 실패:", replyError);
		}
	}
};
