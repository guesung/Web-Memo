import { HIGHLIGHT_COLORS } from "@web-memo/shared/constants";
import type {
	IFEditHighlightPayload,
	TEditHighlightResponse,
} from "@web-memo/shared/modules/extension-bridge";
import { HighlightService } from "@web-memo/shared/utils";
import {
	getSupabaseClient,
	SupabaseSessionRequiredError,
} from "@web-memo/shared/utils/extension";
import { getValidatedHighlightUrl } from "./getValidatedHighlightUrl";
import { reportBackgroundError } from "./reportBackgroundError";

/** Chrome이 검증한 발신자와 신뢰할 수 없는 변경 본문. */
interface IFEditHighlightRequest {
	payload: unknown;
	sender: chrome.runtime.MessageSender;
}

/** 서버 메시지·URL·수정 내용이 섞이지 않도록 고정 문자열로 만든 오류만 보낸다. */
const reportEditFailure = (stage: string) => {
	reportBackgroundError({
		error: new Error(`highlight_edit_failed: ${stage}`),
		feature: "highlight",
		operation: "edit",
		stage,
	});
};

/** 현재 페이지·인증 사용자 범위를 SQL 조건과 반환 행 양쪽에서 검증한다. */
export const handleEditHighlight = async (
	request: IFEditHighlightRequest,
): Promise<TEditHighlightResponse> => {
	const { payload, sender } = request;
	if (!isValidPayload(payload)) {
		return { success: false, error: "invalid_request" };
	}
	const url = getValidatedHighlightUrl(sender, payload.url);
	if (!url) {
		return { success: false, error: "invalid_request" };
	}
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client.auth.getUser();
		if (error || !data.user) {
			if (error && error.status !== 401 && error.status !== 403) {
				reportEditFailure("auth_unavailable");
				return { success: false, error: "save_failed" };
			}
			return { success: false, error: "unauthenticated" };
		}
		const service = new HighlightService(client);
		const scope = { url, userId: data.user.id };
		const result =
			payload.action === "delete"
				? await service.deleteHighlight(payload.id, scope)
				: await service.updateHighlight({
						id: payload.id,
						request: { color: payload.color },
						scope,
					});
		const row = result.data?.[0];
		if (
			result.error ||
			result.data?.length !== 1 ||
			!row ||
			row.id !== payload.id ||
			row.url !== url ||
			row.user_id !== data.user.id ||
			(payload.action === "color" && row.color !== payload.color)
		) {
			reportEditFailure(result.error ? "database_error" : "empty_result");
			return { success: false, error: "save_failed" };
		}

		return { success: true, highlight: row };
	} catch (error) {
		if (error instanceof SupabaseSessionRequiredError) {
			return { success: false, error: "unauthenticated" };
		}
		reportEditFailure("unexpected_error");
		return { success: false, error: "save_failed" };
	}
};

const isValidPayload = (
	payload: unknown,
): payload is IFEditHighlightPayload => {
	if (!payload || typeof payload !== "object") {
		return false;
	}
	const input = payload as Partial<IFEditHighlightPayload>;

	return (
		Number.isSafeInteger(input.id) &&
		Number(input.id) > 0 &&
		typeof input.url === "string" &&
		input.url.length <= 8192 &&
		(input.action === "delete" ||
			(input.action === "color" &&
				HIGHLIGHT_COLORS.some((color) => color === input.color)))
	);
};
