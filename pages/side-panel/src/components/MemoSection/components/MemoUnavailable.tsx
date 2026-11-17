import { useOnlineStatus } from "@src/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { getResultError, isNetworkError } from "@web-memo/shared/utils";
import { I18n } from "@web-memo/shared/utils/extension";

/**
 * 로그인 세션은 있는데 사용자 확인이 끝나지 않아 메모를 열 수 없을 때 대신 보여 주는 안내.
 * @description 오프라인이나 네트워크 오류면 연결 안내를 보여 주고, 연결이 돌아오면 useSyncLoginStatus가 다시 확인한다.
 * 연결 문제가 아닌데 사용자가 없으면 던져서 경계의 재시도 폴백이 받게 한다.
 */
export default function MemoUnavailable() {
	const isOnline = useOnlineStatus();
	const queryClient = useQueryClient();
	const isNetworkUnavailable =
		!isOnline ||
		isUserCheckNetworkError(queryClient.getQueryState(QUERY_KEY.user()));

	if (!isNetworkUnavailable) {
		throw new Error(I18n.get("memo_load_error"));
	}

	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
			<p className="text-muted-foreground text-sm">
				{I18n.get("login_network_unavailable")}
			</p>
		</div>
	);
}

/**
 * 사용자 확인 쿼리가 네트워크 오류로 끝났는지 본다.
 * @description Supabase `getUser`는 요청 실패를 던지지 않고 `{ error }` 값으로 돌려주므로,
 * 던진 오류와 결과에 담긴 오류를 둘 다 확인한다. `navigator.onLine`이 true여도 DNS·서버에
 * 닿지 못하는 경우를 여기서 잡는다.
 */
const isUserCheckNetworkError = (
	userQueryState: { error?: unknown; data?: unknown } | undefined,
): boolean =>
	isNetworkError(userQueryState?.error) ||
	isNetworkError(getResultError(userQueryState?.data));
