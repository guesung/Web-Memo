import type { NextRequest } from "next/server";

import { getSlackSigningSecret } from "./config";
import { verifySlackRequest } from "./verifyRequest";

/**
 * Slack이 보낸 요청을 검증하고 폼 본문을 파싱합니다.
 *
 * @description Slack의 Interactivity·Slash Command는 모두
 * `application/x-www-form-urlencoded`로 오고, 서명은 파싱 전 원본 문자열에 대해
 * 계산됩니다. 그래서 `request.formData()`를 쓰지 않고 직접 텍스트를 읽어 검증한 뒤
 * `URLSearchParams`로 파싱합니다.
 *
 * @returns 검증에 성공하면 파싱된 폼, 실패하면 null (호출부는 401을 돌려줍니다)
 */
export const readVerifiedSlackForm = async (
	request: NextRequest,
): Promise<URLSearchParams | null> => {
	const rawBody = await request.text();
	const { isValid, reason } = verifySlackRequest({
		rawBody,
		signature: request.headers.get("x-slack-signature"),
		timestamp: request.headers.get("x-slack-request-timestamp"),
		signingSecret: getSlackSigningSecret(),
	});

	if (!isValid) {
		console.error(`Slack 서명 검증 실패: ${reason}`);

		return null;
	}

	return new URLSearchParams(rawBody);
};
