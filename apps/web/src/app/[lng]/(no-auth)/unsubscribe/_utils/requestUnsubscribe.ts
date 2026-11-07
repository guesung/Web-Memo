import { SUPABASE } from "@web-memo/shared/constants";

const UNSUBSCRIBE_ENDPOINT = `${SUPABASE.url}/functions/v1/weekly-report-unsubscribe`;

/** 수신 거부 요청의 결과입니다. */
export type TUnsubscribeResult = "ok" | "invalidToken" | "failed";

/**
 * 메일 링크의 토큰으로 주간 메모 메일 수신을 끕니다.
 * @description 200은 완료, 401은 잘못된 토큰이고 그 외 응답과 네트워크 오류는 실패입니다.
 * 토큰은 쿼리에서 받은 그대로 보냅니다.
 */
export const requestUnsubscribe = async (
	token: string,
): Promise<TUnsubscribeResult> => {
	try {
		const response = await fetch(UNSUBSCRIBE_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token }),
		});

		if (response.ok) return "ok";
		if (response.status === 401) return "invalidToken";
		return "failed";
	} catch {
		return "failed";
	}
};
