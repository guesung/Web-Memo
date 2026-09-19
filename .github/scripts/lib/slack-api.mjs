/**
 * Slack Web API(chat.postMessage)로 스레드 메시지를 보냅니다.
 *
 * Incoming Webhook은 채널 최상위 메시지만 보낼 수 있어 스레드를 만들지 못합니다.
 * 루트 메시지의 ts를 thread_ts로 넘겨야 댓글이 되므로 봇 토큰이 필요합니다.
 *
 * 알림은 빌드·배포 잡의 결론을 바꾸면 안 됩니다. 그래서 이 모듈의 함수는
 * 전송이 실패해도 던지지 않고 ::warning::을 남긴 채 결과 객체로 돌려줍니다.
 */

import { postToSlack } from "./slack-blocks.mjs";

const CHAT_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage";

/**
 * 워크플로 명령(::warning::)은 한 줄이어야 합니다. 외부에서 온 문자열의 개행이
 * 그대로 실리면 뒤 줄이 별개의 명령으로 해석될 수 있어 개행을 공백으로 바꿉니다.
 */
export const toSingleLine = (value) => String(value).replace(/[\r\n]+/g, " ");

const warn = (message) => {
	console.warn(`::warning::${toSingleLine(message)}`);
};

/**
 * 스크립트가 공통으로 받는 Slack 환경변수를 한곳에서 읽습니다.
 * 빈 문자열은 없는 값으로 다룹니다(워크플로가 없는 output을 빈 값으로 넘기므로).
 */
export const readSlackEnv = (env = process.env) => ({
	botToken: env.SLACK_BOT_TOKEN || "",
	channelId: env.SLACK_CHANNEL_ID || "",
	threadTs: env.SLACK_THREAD_TS || "",
	webhookUrl: env.SLACK_WEBHOOK_URL || "",
});

/**
 * chat.postMessage를 한 번 호출합니다.
 *
 * Slack은 실패해도 HTTP 200을 주므로 본문의 ok를 봅니다. 상태 코드만 확인하면
 * invalid_auth·channel_not_found가 전부 성공으로 보입니다.
 *
 * 던지지 않습니다. 네트워크 오류·비정상 응답·ok:false 모두 { ok: false, error }로
 * 돌려주며, error에는 Slack이 준 값(invalid_auth 등)이 그대로 들어갑니다.
 *
 * @param {object} params
 * @param {string} params.token 봇 토큰. 어디에도 출력하지 않습니다.
 * @param {string} params.channel 채널 ID
 * @param {{ text: string, blocks: object[] }} params.payload
 * @param {string} [params.threadTs] 있으면 그 메시지의 스레드 댓글로 보냅니다. 없으면 루트입니다.
 * @returns {Promise<{ ok: true, ts: string } | { ok: false, error: string }>}
 */
export const postSlackMessage = async ({
	token,
	channel,
	payload,
	threadTs,
}) => {
	try {
		const response = await fetch(CHAT_POST_MESSAGE_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json; charset=utf-8",
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				channel,
				text: payload.text,
				blocks: payload.blocks,
				...(threadTs ? { thread_ts: threadTs } : {}),
				unfurl_links: false,
			}),
		});

		if (!response.ok) {
			return { ok: false, error: `http_${response.status}` };
		}

		const result = await response.json();

		if (!result.ok) {
			return { ok: false, error: result.error ?? "unknown_error" };
		}

		if (!result.ts) {
			return { ok: false, error: "missing_ts" };
		}

		return { ok: true, ts: result.ts };
	} catch (error) {
		return {
			ok: false,
			error: `request_failed: ${error instanceof Error ? error.message : error}`,
		};
	}
};

/**
 * 웹훅으로 최상위 메시지를 보냅니다. 실패해도 던지지 않습니다.
 * 배포 버튼은 웹훅 경로로도 살아 있어야 하므로 기존 postToSlack을 그대로 씁니다.
 */
const sendByWebhook = async ({ webhookUrl, payload }) => {
	try {
		await postToSlack(webhookUrl, payload);

		return { ok: true, via: "webhook" };
	} catch (error) {
		warn(
			`Slack 웹훅 전송에 실패했습니다: ${error instanceof Error ? error.message : error}`,
		);

		return { ok: false, via: "none" };
	}
};

/**
 * 스레드 댓글을 우선으로 보내고, 스레드로 못 보내는 사정이면 웹훅 최상위 메시지로 내려갑니다.
 *
 * 스레드로 보내는 조건은 토큰·채널·루트 ts가 모두 있는 경우입니다. 하나라도 없거나
 * 전송이 실패하면 웹훅으로 보냅니다. 요약(배포 버튼)과 테섭 결과는 스레드가
 * 안 만들어져도 반드시 채널에 나가야 하기 때문입니다.
 *
 * 어느 경로도 던지지 않습니다. 실패는 ::warning::으로 남고 { ok: false }로 돌려줍니다.
 *
 * @param {object} params
 * @param {{ text: string, blocks: object[] }} params.payload
 * @param {{ botToken: string, channelId: string, threadTs: string, webhookUrl: string }} params.slack readSlackEnv()의 결과
 * @returns {Promise<{ ok: boolean, via: "thread" | "webhook" | "none", ts?: string }>}
 */
export const sendSlackMessage = async ({ payload, slack }) => {
	const { botToken, channelId, threadTs, webhookUrl } = slack;

	const missing = [
		!botToken && "SLACK_BOT_TOKEN",
		!channelId && "SLACK_CHANNEL_ID",
	].filter(Boolean);

	if (missing.length > 0) {
		warn(`${missing.join(", ")} 이(가) 없어 스레드 대신 웹훅으로 보냅니다`);
	} else if (!threadTs) {
		warn("스레드 루트 ts 가 비어 있어 스레드 대신 웹훅으로 보냅니다");
	} else {
		const result = await postSlackMessage({
			token: botToken,
			channel: channelId,
			payload,
			threadTs,
		});

		if (result.ok) {
			return { ok: true, via: "thread", ts: result.ts };
		}

		warn(
			`Slack 스레드 댓글 전송에 실패했습니다(${result.error}). 웹훅으로 보냅니다`,
		);
	}

	if (!webhookUrl) {
		warn("SLACK_WEBHOOK_URL 이 없어 Slack 전송을 건너뜁니다");

		return { ok: false, via: "none" };
	}

	return await sendByWebhook({ webhookUrl, payload });
};
