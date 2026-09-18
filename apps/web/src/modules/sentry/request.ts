import { getSentryWebhookSecret } from "./config";
import { verifySentryWebhook } from "./verifyWebhook";

/** Sentry Internal Integration의 `error` 리소스 웹훅 본문 (필요한 필드만). */
export interface IFSentryErrorWebhookPayload {
	action: string;
	data?: {
		error?: {
			title?: string;
			message?: string;
			culprit?: string;
			web_url?: string;
			issue_url?: string;
			tags?: [string, string][];
		};
	};
}

/**
 * Sentry가 보낸 웹훅 요청을 검증하고 JSON 본문을 파싱합니다.
 *
 * @description 서명은 파싱 전 원본 문자열에 대해 계산되므로 `request.json()`을
 * 바로 쓰지 않고 원본 텍스트를 먼저 읽어 검증합니다.
 *
 * @returns 검증에 성공하면 파싱된 페이로드, 실패하면 null (호출부는 401을 돌려줍니다)
 */
export const readVerifiedSentryWebhook = async (
	request: Request,
): Promise<IFSentryErrorWebhookPayload | null> => {
	const rawBody = await request.text();
	const { isValid, reason } = verifySentryWebhook({
		rawBody,
		signature: request.headers.get("sentry-hook-signature"),
		clientSecret: getSentryWebhookSecret(),
	});

	if (!isValid) {
		console.error(`Sentry 웹훅 서명 검증 실패: ${reason}`);

		return null;
	}

	return JSON.parse(rawBody) as IFSentryErrorWebhookPayload;
};
