import type {
	CreateMemoPayload,
	CreateMemoResponse,
} from "@web-memo/shared/modules/extension-bridge";
import { MemoService, normalizeUrl } from "@web-memo/shared/utils";
import { getSupabaseClient, I18n } from "@web-memo/shared/utils/extension";
import { reportBackgroundError } from "./reportBackgroundError";

/** content-ui의 메모 생성 요청을 받아 기존 메모가 있으면 이어 붙이고, 없으면 새로 만든다. */
export const handleCreateMemo = async (
	payload: CreateMemoPayload,
): Promise<CreateMemoResponse> => {
	try {
		const supabaseClient = await getSupabaseClient();
		const memoService = new MemoService(supabaseClient);

		// 사이드 패널·웹과 같은 기준으로 메모를 찾도록 URL을 정규화한다.
		const normalizedUrl = normalizeUrl(payload.url);
		const existingMemo = await memoService.getMemoByUrl(normalizedUrl);

		if (existingMemo.error) {
			return failWithReport(
				existingMemo.error,
				"lookup",
				existingMemo.error.message,
			);
		}
		if ((existingMemo.data?.length ?? 0) > 1) {
			return { success: false, error: "multiple_memos" };
		}

		// Supabase는 결과가 없을 때 빈 배열을 돌려주므로 첫 번째 요소로 존재 여부를 판단한다.
		const currentMemo = existingMemo.data?.[0];

		if (currentMemo) {
			const updatedMemo = `${currentMemo.memo}${currentMemo.memo ? "\n\n" : ""}${payload.memo}`;
			const result = await memoService.updateMemo({
				id: currentMemo.id,
				request: { memo: updatedMemo },
			});

			if (result.error) {
				return failWithReport(result.error, "update", result.error.message);
			}
			return { success: true };
		}

		const result = await memoService.insertMemo({
			...payload,
			url: normalizedUrl,
		});

		if (result.error) {
			return failWithReport(result.error, "insert", result.error.message);
		}
		return { success: true };
	} catch (error) {
		return failWithReport(
			error,
			"handler",
			error instanceof Error ? error.message : I18n.get("toast_error_save"),
		);
	}
};

/** Sentry에 고정된 stage 값으로 보고하고 같은 형태의 실패 응답을 돌려준다. */
const failWithReport = (
	error: unknown,
	stage: string,
	errorMessage: string,
): CreateMemoResponse => {
	reportBackgroundError({
		error,
		feature: "memo",
		operation: "create-memo",
		stage,
	});

	return { success: false, error: errorMessage };
};
