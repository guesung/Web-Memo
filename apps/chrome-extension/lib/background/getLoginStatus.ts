import type { IFGetLoginStatusResponse } from "@web-memo/shared/modules/extension-bridge";
import { getAuthenticatedClient } from "./createHighlight";

/**
 * content script가 하이라이트 버블을 띄워도 되는지 판단할 로그인 여부를 돌려준다.
 *
 * @description 저장된 세션의 존재만 본다. `auth.getUser()`로 서버 검증을 하지 않으므로
 * 만료·폐기된 세션도 true가 될 수 있고, 실제 인증은 저장 시점(CREATE_HIGHLIGHT)에서 다시 한다.
 * 세션이 없거나 확인 중 예외가 나면 false를 돌려준다.
 */
export const handleGetLoginStatus =
	async (): Promise<IFGetLoginStatusResponse> => {
		try {
			const supabaseClient = await getAuthenticatedClient();
			if (!supabaseClient) {
				return { isLoggedIn: false };
			}

			const { data, error } = await supabaseClient.auth.getSession();
			if (error || !data.session) {
				return { isLoggedIn: false };
			}

			return { isLoggedIn: true };
		} catch {
			// 페이지마다 호출되므로 Sentry로 보내지 않고, 원인 메시지 없이 고정 코드만 남긴다.
			console.warn("[Web Memo] login_status_check_failed");

			return { isLoggedIn: false };
		}
	};
