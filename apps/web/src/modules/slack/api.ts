import { getSlackBotToken } from "./config";

const SLACK_API_ORIGIN = "https://slack.com/api";

/**
 * Slack Web API 호출.
 *
 * @description Slack은 실패해도 HTTP 200을 주므로 본문의 `ok`를 봐야 합니다.
 * 상태 코드만 확인하면 모든 실패가 성공으로 보입니다.
 */
const callSlackApi = async (
	method: string,
	payload: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
	const response = await fetch(`${SLACK_API_ORIGIN}/${method}`, {
		method: "POST",
		headers: {
			"content-type": "application/json; charset=utf-8",
			authorization: `Bearer ${getSlackBotToken()}`,
		},
		body: JSON.stringify(payload),
	});

	const result = (await response.json()) as {
		ok: boolean;
		error?: string;
		response_metadata?: { messages?: string[] };
	};

	if (!result.ok) {
		const detail = result.response_metadata?.messages?.join(", ") ?? "";

		throw new Error(
			`${method} 실패: ${result.error}${detail && ` (${detail})`}`,
		);
	}

	return result as unknown as Record<string, unknown>;
};

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
	const response = await fetch(responseUrl, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			response_type: isEphemeral ? "ephemeral" : "in_channel",
			replace_original: false,
			text,
		}),
	});

	// response_url은 실패해도 HTTP 200에 본문으로 사유를 담아 보냅니다(expired_url 등).
	// 여기서 확인하지 않으면 "에러를 알리려던 시도"까지 조용히 사라져,
	// 사용자에게는 버튼이 아무 반응 없는 것처럼 보입니다.
	const body = (await response.text()).trim();

	if (!response.ok || body !== "ok") {
		console.error(
			`Slack 응답 전송 실패: ${response.status} ${body.slice(0, 200)}`,
		);
	}
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
}): Promise<string> => {
	const result = await callSlackApi("views.open", {
		trigger_id: triggerId,
		view,
	});

	return (result.view as { id: string }).id;
};

/**
 * 이미 열려 있는 모달의 내용을 교체합니다.
 *
 * @description trigger_id 3초 제한 때문에 모달은 외부 호출 없이 먼저 띄우고,
 * 느린 데이터(GitHub 태그·커밋 목록)는 이걸로 나중에 채웁니다.
 * 실패해도 모달 자체는 이미 떠 있으므로 호출부가 삼켜도 됩니다.
 */
export const updateSlackModal = async ({
	viewId,
	view,
}: {
	viewId: string;
	view: Record<string, unknown>;
}): Promise<void> => {
	await callSlackApi("views.update", { view_id: viewId, view });
};

/**
 * 절대 예외를 던지지 않는 Slack 알림.
 *
 * @description 에러를 사용자에게 알리려는 호출이 스스로 던지면, 원래 에러까지 함께
 * 사라지고 Slack에는 정체불명의 실패만 남습니다. 배포가 이미 시작된 뒤의 알림도
 * 마찬가지로, 알림 실패가 배포 자체를 실패로 보이게 해선 안 됩니다.
 */
export const notifySlackSafely = async (params: {
	responseUrl: string;
	text: string;
	isEphemeral?: boolean;
}): Promise<void> => {
	try {
		await respondToSlack(params);
	} catch (error) {
		console.error("Slack 알림 전송 중 예외:", error);
	}
};
