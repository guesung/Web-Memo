import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Slack이 재전송 공격을 막기 위해 두는 허용 오차(초).
 * Slack 공식 권장값입니다.
 */
const SIGNATURE_TOLERANCE_SECONDS = 60 * 5;

/** 서명 검증 결과. 실패 사유는 로그에만 남기고 Slack에는 401만 돌려줍니다. */
interface IFVerifyResult {
	/** 서명이 유효한지 */
	isValid: boolean;
	/** 실패 사유 (성공 시 null) */
	reason: string | null;
}

/**
 * Slack 요청의 서명을 검증합니다.
 *
 * @description 서명은 **가공되지 않은 원본 본문**에 대해 계산됩니다. 폼 파싱을 먼저 하면
 * 인코딩이 미묘하게 달라져 검증이 항상 실패하므로, 호출부는 반드시 `request.text()`로
 * 읽은 원본 문자열을 그대로 넘겨야 합니다.
 *
 * 이 엔드포인트는 누구나 POST할 수 있는 공개 URL이고 통과하면 스토어 배포가 돌아가므로,
 * 검증 실패는 예외 없이 거부합니다.
 */
export const verifySlackRequest = ({
	rawBody,
	signature,
	timestamp,
	signingSecret,
}: {
	rawBody: string;
	signature: string | null;
	timestamp: string | null;
	signingSecret: string;
}): IFVerifyResult => {
	if (!signature || !timestamp) {
		return { isValid: false, reason: "서명 헤더가 없습니다" };
	}

	const elapsedSeconds = Math.abs(
		Math.floor(Date.now() / 1000) - Number(timestamp),
	);

	if (Number.isNaN(elapsedSeconds)) {
		return { isValid: false, reason: "타임스탬프를 해석할 수 없습니다" };
	}

	if (elapsedSeconds > SIGNATURE_TOLERANCE_SECONDS) {
		return { isValid: false, reason: "타임스탬프가 허용 범위를 벗어났습니다" };
	}

	const expected = `v0=${createHmac("sha256", signingSecret)
		.update(`v0:${timestamp}:${rawBody}`)
		.digest("hex")}`;

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
