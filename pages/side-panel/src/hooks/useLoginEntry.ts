import { CONFIG } from "@web-memo/env";
import { PATHS } from "@web-memo/shared/constants";
import { analytics } from "@web-memo/shared/modules/analytics";
import { Identity, Tab } from "@web-memo/shared/utils/extension";
import { useState } from "react";
import { PANEL_LOGIN_EVENT } from "./useSyncLoginStatus";

/** 패널에서 바로 시작할 수 있는 로그인 제공자입니다. 웹의 OAuth 시작 경로가 받는 제공자와 같아야 한다. */
export type TLoginProvider = "kakao" | "google";

/**
 * 고른 제공자의 로그인 창을 띄우는 진입점.
 * @description 로그인 창은 웹의 OAuth 시작 경로를 엽니다. 로그인 자체는 웹에서 끝나 웹 쿠키에
 * 세션이 생기고, 창이 닫히면 패널이 그 쿠키로 세션을 복원합니다. 그래서 웹과 확장이 함께
 * 로그인됩니다. 웹 메모 화면을 거치지 않으므로 `login`·`sign_up`은 여기서 대신 기록합니다.
 *
 * 확장의 client_id를 `ext_cid`로 실어 보냅니다. 확장과 웹은 서로 다른 식별자를 써서 그냥 두면
 * "사이드패널까지 왔다가 가입하지 않은 사람"을 셀 수 없습니다.
 *
 * 로그인 창을 쓸 수 없는 브라우저에서는 같은 경로를 새 탭으로 엽니다.
 * 패널의 모든 [로그인]은 이 훅을 쓰는 LoginProviderMenu를 연다.
 */
export default function useLoginEntry() {
	const [pendingProvider, setPendingProvider] = useState<TLoginProvider | null>(
		null,
	);
	const [hasLoginError, setHasLoginError] = useState(false);

	const openLogin = async (provider: TLoginProvider) => {
		analytics.trackEvent({
			name: "side_panel_login_click",
			params: { method: provider },
		});

		const clientId = await analytics.getExtensionClientId();
		const startUrl = new URL(`${CONFIG.webUrl}${PATHS.startOAuth}`);

		startUrl.searchParams.set("provider", provider);
		if (clientId) startUrl.searchParams.set("ext_cid", clientId);

		if (!Identity.canLaunchWebAuthFlow()) {
			Tab.create({ url: startUrl.toString() });
			return;
		}

		startUrl.searchParams.set("return", "extension");
		setPendingProvider(provider);
		setHasLoginError(false);

		try {
			const returnedUrl = await Identity.launchWebAuthFlow(startUrl.toString());

			// 사용자가 창을 닫았다. 오류가 아니므로 조용히 원래대로 돌아간다.
			if (!returnedUrl) return;

			const result = new URL(returnedUrl).searchParams;
			const loginMethod = result.get("login");

			if (!loginMethod) {
				setHasLoginError(true);
				return;
			}

			if (result.get("signup") === "true") {
				analytics.trackEvent({
					name: "sign_up",
					params: { method: loginMethod },
				});
			}
			analytics.trackEvent({ name: "login", params: { method: loginMethod } });

			window.dispatchEvent(new Event(PANEL_LOGIN_EVENT));
		} catch {
			setHasLoginError(true);
		} finally {
			setPendingProvider(null);
		}
	};

	return { openLogin, pendingProvider, hasLoginError };
}
