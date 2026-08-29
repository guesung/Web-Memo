import { getSlackBotToken } from "./config";

const SLACK_API_ORIGIN = "https://slack.com/api";

/**
 * 버튼을 누른 메시지 자리에 후속 메시지를 보냅니다.
 *
 * @description response_url은 봇 토큰 없이도 쓸 수 있고 30분/5회까지 유효합니다.
 * 배포 시작 알림처럼 "그 메시지에 대한 답"에는 이쪽이 맞습니다.
 */
export const respondToSlack = async ({
	responseUrl,
	text,
	isEphemeral = false,
}: {
	responseUrl: string;
	text: string;
	isEphemeral?: boolean;
}): Promise<void> => {
	await fetch(responseUrl, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			response_type: isEphemeral ? "ephemeral" : "in_channel",
			replace_original: false,
			text,
		}),
	});
};

/**
 * 모달을 엽니다.
 *
 * @description trigger_id는 발급 후 3초 안에 써야 합니다. 이 호출 앞에 느린 작업을
 * 두면 `expired_trigger_id`로 조용히 실패하므로, 준비 작업은 모두 병렬로 끝낸 뒤
 * 마지막에 호출하세요. Slack API는 실패해도 HTTP 200을 주므로 본문의 `ok`를 봐야 합니다.
 */
export const openSlackModal = async ({
	triggerId,
	view,
}: {
	triggerId: string;
	view: Record<string, unknown>;
}): Promise<void> => {
	const response = await fetch(`${SLACK_API_ORIGIN}/views.open`, {
		method: "POST",
		headers: {
			"content-type": "application/json; charset=utf-8",
			authorization: `Bearer ${getSlackBotToken()}`,
		},
		body: JSON.stringify({ trigger_id: triggerId, view }),
	});

	const result = (await response.json()) as { ok: boolean; error?: string };

	if (!result.ok) {
		throw new Error(`모달을 열지 못했습니다: ${result.error}`);
	}
};
