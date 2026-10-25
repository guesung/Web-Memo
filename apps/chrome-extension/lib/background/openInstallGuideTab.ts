import { CONFIG } from "@web-memo/env";
import { analytics } from "@web-memo/shared/modules/analytics";
import { Tab } from "@web-memo/shared/utils/extension";

/**
 * 설치 직후 웹의 공개 가이드를 새 탭으로 엽니다.
 * @description 확장의 client_id를 `ext_cid`로 실어 보내 웹 가입까지 한 사용자로 이어 집계합니다.
 * client_id를 얻지 못하면 `ext_cid` 없이 엽니다.
 *
 * 탭을 연 결과는 `install_guide_tab_opened`로 남깁니다. 웹 페이지의 gtag는 광고 차단기에
 * 막힐 수 있어 `install_guide_view`가 비면 "탭이 안 열렸다"와 "열렸지만 gtag가 막혔다"를
 * 구분할 수 없습니다. 백그라운드의 Measurement Protocol 전송은 차단기에 막히지 않습니다.
 */
export const openInstallGuideTab = async (): Promise<void> => {
	const guideUrl = new URL(`${CONFIG.webUrl}/install`);

	try {
		const clientId = await analytics.getExtensionClientId();
		if (clientId) {
			guideUrl.searchParams.set("ext_cid", clientId);
		}
	} catch (error) {
		console.warn("[install-guide] client_id를 얻지 못했습니다.", error);
	}

	let isSuccess = true;
	try {
		await Tab.create({ url: guideUrl.toString() });
	} catch (error) {
		isSuccess = false;
		console.warn("[install-guide] 가이드 탭을 열지 못했습니다.", error);
	}

	// service worker가 전송 전에 종료되지 않도록 await로 붙잡습니다.
	try {
		await analytics.trackEvent({
			name: "install_guide_tab_opened",
			params: { is_success: isSuccess },
		});
	} catch (error) {
		console.warn(
			"[analytics] install_guide_tab_opened 전송에 실패했습니다.",
			error,
		);
	}
};
