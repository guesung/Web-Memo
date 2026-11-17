import { CONFIG } from "@web-memo/env";
import { PATHS } from "@web-memo/shared/constants";
import { analytics } from "@web-memo/shared/modules/analytics";
import { Tab } from "@web-memo/shared/utils/extension";

/**
 * 웹 로그인 화면을 새 탭으로 여는 진입점.
 * @description 로그인은 웹에서 끝나 웹 쿠키에 세션이 생기고, 웹이 SYNC_LOGIN_STATUS로 패널에 알린다.
 * 확장의 client_id를 `ext_cid`로 실어 보낸다. 확장과 웹은 서로 다른 식별자를 써서 그냥 두면
 * "사이드패널까지 왔다가 가입하지 않은 사람"을 셀 수 없다.
 * 헤더 버튼·요약 안내처럼 패널의 모든 [로그인]이 이 훅을 쓴다.
 */
export default function useLoginEntry() {
	const openLogin = async () => {
		analytics.trackEvent({ name: "side_panel_login_click", params: {} });

		const clientId = await analytics.getExtensionClientId();
		const loginUrl = new URL(`${CONFIG.webUrl}${PATHS.login}`);
		if (clientId) loginUrl.searchParams.set("ext_cid", clientId);

		Tab.create({ url: loginUrl.toString() });
	};

	return { openLogin };
}
