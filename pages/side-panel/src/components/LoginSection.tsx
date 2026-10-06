import { type QueryState, useQueryClient } from "@tanstack/react-query";
import { CONFIG } from "@web-memo/env";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { analytics } from "@web-memo/shared/modules/analytics";
import { getResultError, isNetworkError } from "@web-memo/shared/utils";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import { Button } from "@web-memo/ui";
import { ExternalLinkIcon } from "lucide-react";
import useOnlineStatus from "../hooks/useOnlineStatus";

/**
 * 로그인이 필요할 때 메모 영역 자리에 대신 보여주는 안내
 *
 * @description
 * MemoSection 의 ErrorBoundary 폴백으로도 쓰이므로 props 를 받지 않는다.
 * 네트워크가 끊겨 로그인 여부를 확인하지 못한 경우에는 로그인 안내 대신 연결 안내를 보여준다.
 * 오프라인에서는 로그인 탭도 열리지 않으므로 버튼을 숨긴다.
 */
export default function LoginSection() {
	const isOnline = useOnlineStatus();
	const queryClient = useQueryClient();
	const isNetworkUnavailable =
		!isOnline ||
		getIsUserCheckNetworkError(queryClient.getQueryState(QUERY_KEY.user()));

	/**
	 * 로그인 페이지를 새 탭으로 엽니다.
	 * @description 확장의 client_id를 쿼리로 실어 보냅니다. 사이드패널은 비로그인이고
	 * 로그인은 웹 탭에서 끝나는데, 확장과 웹은 서로 다른 식별자를 써서 그냥 두면
	 * "사이드패널까지 왔다가 가입하지 않은 사람"을 셀 수 없습니다.
	 */
	const handleLoginButtonClick = async () => {
		analytics.trackEvent({ name: "side_panel_login_click" });

		const clientId = await analytics.getExtensionClientId();
		const loginUrl = new URL(`${CONFIG.webUrl}/login`);

		if (clientId) loginUrl.searchParams.set("ext_cid", clientId);

		Tab.create({ url: loginUrl.toString() });
	};

	if (isNetworkUnavailable) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
				<p className="text-muted-foreground text-sm">
					{I18n.get("login_network_unavailable")}
				</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
			<p className="text-muted-foreground text-sm">
				메모 기능을 이용하려면 로그인이 필요합니다.
			</p>
			<Button variant="outline" size="sm" onClick={handleLoginButtonClick}>
				로그인하러가기
				<ExternalLinkIcon />
			</Button>
		</div>
	);
}

/**
 * 사용자 확인 쿼리가 네트워크 오류로 끝났는지 본다.
 * @description Supabase `getUser`는 요청 실패를 던지지 않고 `{ error }` 값으로 돌려주므로,
 * 던진 오류와 결과에 담긴 오류를 둘 다 확인한다. `navigator.onLine`이 true여도 DNS·서버에
 * 닿지 못하는 경우를 여기서 잡는다.
 */
const getIsUserCheckNetworkError = (
	userQueryState: QueryState | undefined,
): boolean =>
	isNetworkError(userQueryState?.error) ||
	isNetworkError(getResultError(userQueryState?.data));
