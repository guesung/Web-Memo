/**
 * GA 리포트 본문을 Slack 에 올립니다. 일일·주간 리포트가 함께 씁니다.
 *
 * 봇(SLACK_BOT_TOKEN + GA_REPORT_CHANNEL_ID)으로 먼저 올립니다. 봇으로 올려야 메시지
 * ts 를 받아 AI 인사이트를 그 스레드에 달 수 있고, 채널도 리포트마다 다르게 고를 수
 * 있습니다. 봇 게시가 실패하면 기존 웹훅(SLACK_REPORT_WEBHOOK_URL)으로 내려가 본문만
 * 올립니다 — 이때는 스레드를 만들 수 없어 인사이트 댓글을 건너뜁니다.
 */

import { postRootMessage } from "../shared/slack-api.mjs";

/**
 * @param {object} params
 * @param {{ text: string, blocks: object[] }} params.payload
 * @param {NodeJS.ProcessEnv} [params.env]
 * @returns {Promise<
 *   | { via: "bot", ts: string, channel: string }
 *   | { via: "webhook" }
 *   | { via: "none" }
 * >} via 가 none 이면 보낼 수단이 없어 페이로드만 출력한 것입니다(로컬 확인).
 * @throws 수단은 있는데 봇과 웹훅이 모두 실패하면 던집니다. 리포트가 안 나간 것은 잡의 실패입니다.
 */
export const publishGaReport = async ({ payload, env = process.env }) => {
	const botToken = env.SLACK_BOT_TOKEN || "";
	const channelId = env.GA_REPORT_CHANNEL_ID || "";
	const webhookUrl = env.SLACK_REPORT_WEBHOOK_URL || "";

	if (!(botToken && channelId) && !webhookUrl) {
		console.warn(
			"::warning::SLACK_BOT_TOKEN·GA_REPORT_CHANNEL_ID 와 SLACK_REPORT_WEBHOOK_URL 이 모두 없어 Slack 전송을 건너뜁니다",
		);
		console.log(JSON.stringify(payload, null, 2));

		return { via: "none" };
	}

	const result = await postRootMessage({
		payload,
		botToken,
		channelId,
		webhookUrl,
	});

	if (!result.ok) {
		throw new Error(`Slack 전송 실패: ${result.error}`);
	}

	return result.via === "bot"
		? { via: "bot", ts: result.ts, channel: result.channel }
		: { via: "webhook" };
};
