import {
	getSupabaseClient,
	SupabaseSessionRequiredError,
} from "@web-memo/shared/utils/extension";

/** 기존 클라이언트 초기화는 쿠키가 없으면 예외를 던진다. 로그인 안내로 변환한다. */
export const getAuthenticatedClient = async () => {
	try {
		return await getSupabaseClient();
	} catch (error) {
		if (error instanceof SupabaseSessionRequiredError) {
			return null;
		}
		throw error;
	}
};
