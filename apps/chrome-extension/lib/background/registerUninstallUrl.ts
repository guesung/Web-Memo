import { CONFIG } from "@web-memo/env";
import { analytics } from "@web-memo/shared/modules/analytics";

const MAX_UNINSTALL_URL_LENGTH = 1023;

export const registerUninstallUrl = async (): Promise<void> => {
	try {
		const url = new URL("/api/uninstall", CONFIG.webUrl);
		url.searchParams.set("v", chrome.runtime.getManifest().version);

		try {
			const clientId = await analytics.getExtensionClientId();
			if (clientId) {
				url.searchParams.set("cid", clientId);
				if (url.toString().length > MAX_UNINSTALL_URL_LENGTH) {
					url.searchParams.delete("cid");
				}
			}
		} catch (error) {
			console.warn("[uninstall] client_id를 얻지 못했습니다.", error);
		}

		await chrome.runtime.setUninstallURL(url.toString());
	} catch (error) {
		console.warn("[uninstall] 제거 URL을 등록하지 못했습니다.", error);
	}
};
