import { Injectable } from "@nestjs/common";

const SLACK_TIMEOUT_MS = 5_000;

export class SlackDeliveryError extends Error {}

@Injectable()
export class SlackService {
	/**
	 * Incoming Webhook으로 메시지를 보낸다.
	 * @description Slack은 실패해도 사유를 본문(no_service, invalid_payload 등)으로 주므로 상태와 본문을 둘 다 본다.
	 * 응답이 없으면 5초 뒤 포기한다 — 기다리는 동안 Supabase 쪽 요청도 붙잡히기 때문이다.
	 */
	async send(webhookUrl: string, text: string) {
		let response: Response;

		try {
			response = await fetch(webhookUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text }),
				signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
			});
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);

			throw new SlackDeliveryError(`Slack 요청 실패 — ${reason}`);
		}

		const body = await response.text();

		if (!response.ok || body !== "ok") {
			throw new SlackDeliveryError(
				`Slack 전송 실패 — status ${response.status}, body ${body}`,
			);
		}
	}
}
