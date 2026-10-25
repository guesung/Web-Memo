import { createHmac, timingSafeEqual } from "node:crypto";

/** 서명 검증 결과. 실패 사유는 로그에만 남기고 Sentry에는 401만 돌려줍니다. */
interface IFVerifyResult {
	/** 서명이 유효한지 */
	isValid: boolean;
	/** 실패 사유 (성공 시 null) */
	reason: string | null;
}

/**
 * Sentry Internal Integration 웹훅의 서명을 검증합니다.
 *
 * @description Sentry는 Slack과 달리 타임스탬프 없이, Client Secret으로 만든
 * HMAC-SHA256 hex digest를 그대로 `sentry-hook-signature` 헤더에 담아 보냅니다.
 * 서명은 **가공되지 않은 원본 본문**에 대해 계산되므로, 호출부는 반드시
 * `request.text()`로 읽은 원본 문자열을 그대로 넘겨야 합니다.
 *
 * 이 엔드포인트는 누구나 POST할 수 있는 공개 URL이고 통과하면 Slack에 알림이
 * 올라가므로, 검증 실패는 예외 없이 거부합니다.
 */
export const verifySentryWebhook = ({
	rawBody,
	signature,
	clientSecret,
}: {
	rawBody: string;
	signature: string | null;
	clientSecret: string;
}): IFVerifyResult => {
	if (!signature) {
		return { isValid: false, reason: "서명 헤더가 없습니다" };
	}

	const expected = createHmac("sha256", clientSecret)
		.update(rawBody)
		.digest("hex");

	// 길이가 다르면 timingSafeEqual이 던지므로 먼저 걸러냅니다.
	if (expected.length !== signature.length) {
		return { isValid: false, reason: "서명이 일치하지 않습니다" };
	}

	const isValid = timingSafeEqual(
		Buffer.from(expected),
		Buffer.from(signature),
	);

	return {
		isValid,
		reason: isValid ? null : "서명이 일치하지 않습니다",
	};
};
