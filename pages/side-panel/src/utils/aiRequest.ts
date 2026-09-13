import { CONFIG } from "@web-memo/env";
import { getSupabaseClient, I18n } from "@web-memo/shared/utils/extension";

/** AI 권한 및 한도 오류를 사용자에게 안전한 번역 문구로 변환합니다. */
export const getAiErrorMessage = (status: number) => {
	if (status === 401) {
		return I18n.get("billing_ai_signin");
	}
	if (status === 402 || status === 403) {
		return I18n.get("billing_ai_paid");
	}
	if (status === 429) {
		return I18n.get("billing_ai_limit");
	}

	return I18n.get("billing_ai_failed");
};

/** 갱신된 Supabase 세션을 첨부하고 재시도 없이 AI 요청을 실행합니다. */
export const requestAi = async (input: {
	path: string;
	body: unknown;
	signal?: AbortSignal;
	expectedUserId?: string;
}) => {
	const supabaseClient = await getSupabaseClient();
	const { data } = await supabaseClient.auth.getSession();
	if (
		!data.session ||
		(input.expectedUserId && data.session.user.id !== input.expectedUserId)
	) {
		throw new Error(I18n.get("billing_ai_signin"));
	}
	const response = await fetch(`${CONFIG.webUrl}/api/openai${input.path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${data.session.access_token}`,
		},
		body: JSON.stringify(input.body),
		signal: input.signal,
	});
	if (!response.ok) {
		throw new Error(getAiErrorMessage(response.status));
	}

	return response;
};
