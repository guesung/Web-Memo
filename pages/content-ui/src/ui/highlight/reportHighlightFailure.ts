import type { TCreateHighlightResponse } from "@web-memo/shared/modules/extension-bridge";
import { reportContentUiError } from "../../utils/reportError";

/**
 * background가 돌려준 하이라이트 요청 실패 응답을 보고한다. 응답이 없던 경우도 포함한다.
 *
 * @description `unauthenticated`는 로그아웃 상태라 정상이고, `save_failed`는 background가
 * 실패 단계와 함께 이미 보고했으므로 보내지 않는다. content script만 알 수 있는 실패
 * (응답 없음·요청 형식 거부)만 보낸다.
 */
export const reportHighlightResponseFailure = ({
	operation,
	response,
	tags,
}: {
	operation: "create" | "edit";
	response: Extract<TCreateHighlightResponse, { success: false }> | undefined;
	tags?: Record<string, string>;
}): void => {
	const stage = response?.error ?? "no_response";

	if (stage === "unauthenticated" || stage === "save_failed") {
		return;
	}

	reportContentUiError({
		error: new Error(`highlight_request_failed: ${stage}`),
		feature: "highlight",
		operation,
		stage,
		tags,
	});
};
