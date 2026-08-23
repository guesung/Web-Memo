import "webextension-polyfill";

import { CONFIG } from "@web-memo/env";
import { EXTERNAL_LINK } from "@web-memo/shared/constants";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import {
	HighlightService,
	MemoService,
	normalizeUrl,
} from "@web-memo/shared/utils";
import { getSupabaseClient, I18n, Tab } from "@web-memo/shared/utils/extension";

// 확장 프로그램이 설치되었을 때 옵션을 초기화한다.
chrome.runtime.onInstalled.addListener(async () => {
	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
	const language = await ChromeSyncStorage.get(STORAGE_KEYS.language);
	const uiLanguage = I18n.getUILanguage();
	if (!language) ChromeSyncStorage.set(STORAGE_KEYS.language, uiLanguage);
});

// 확장 프로그램이 설치되었을 때 contextMenus를 설정한다.
const CONTEXT_MENU_ID_CHECK_MEMO = "CONTEXT_MENU_ID_CHECK_MEMO";
const CONTEXT_MENU_ID_SHOW_GUIDE = "CONTEXT_MENU_ID_SHOW_GUIDE";
chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		title: I18n.get("context_menus_check_memo"),
		id: CONTEXT_MENU_ID_CHECK_MEMO,
		contexts: ["all"],
	});
	chrome.contextMenus.create({
		title: I18n.get("context_menus_show_guide"),
		id: CONTEXT_MENU_ID_SHOW_GUIDE,
		contexts: ["all"],
	});
});

// contextMenus 각 항목을 누를 때 해당하는 페이지로 이동한다.
if (chrome.contextMenus)
	chrome.contextMenus.onClicked.addListener(async (item) => {
		switch (item.menuItemId) {
			case CONTEXT_MENU_ID_CHECK_MEMO:
				await Tab.create({ url: `${CONFIG.webUrl}/memos` });
				break;
			case CONTEXT_MENU_ID_SHOW_GUIDE:
				if (I18n.getUILanguage() === "ko") Tab.create({ url: EXTERNAL_LINK.notionGuideKo });
				else Tab.create({ url: EXTERNAL_LINK.notionGuideEn });
				break;
		}
	});

const setUninstallUrl = async () => {
	try {
		const supabaseClient = await getSupabaseClient();
		const {
			data: { user },
		} = await supabaseClient.auth.getUser();
		const uid = user?.id || "";
		chrome.runtime.setUninstallURL(
			uid
				? `${CONFIG.webUrl}/uninstall?uid=${uid}`
				: `${CONFIG.webUrl}/uninstall`,
		);
	} catch {
		chrome.runtime.setUninstallURL(`${CONFIG.webUrl}/uninstall`);
	}
};
setUninstallUrl();

chrome.tabs.onActivated.addListener(async () => {
	// 활성화된 탭이 변경되었을 때 사이드 패널을 업데이트한다.
	bridge.request.UPDATE_SIDE_PANEL();
});
chrome.tabs.onUpdated.addListener(async () => {
	// 페이지를 이동했을 때 사이드 패널을 업데이트한다.
	bridge.request.UPDATE_SIDE_PANEL();
});

// content-ui에서 메시지를 전달받아 사이드 패널을 연다.
bridge.handle.OPEN_SIDE_PANEL((_, sender) => {
	if (!sender.tab?.windowId) return;
	chrome.sidePanel.open({ windowId: sender.tab.windowId });
});

bridge.handle.GET_EXTENSION_MANIFEST((_, __, sendResponse) => {
	sendResponse(chrome.runtime.getManifest());
});

bridge.handle.GET_TABS(async (_, __, sendResponse) => {
	const tabs = await Tab.get();
	sendResponse(tabs);
});

// content-ui에서 메모 생성 요청을 받아 처리한다.
// 기존 메모가 있으면 내용을 추가하고, 없으면 새로 생성한다.
bridge.handle.CREATE_MEMO(async (payload, _sender, sendResponse) => {
	try {
		const supabaseClient = await getSupabaseClient();
		const memoService = new MemoService(supabaseClient);

		// 사이드 패널·웹과 같은 기준으로 메모를 찾도록 URL을 정규화한다.
		const normalizedUrl = normalizeUrl(payload.url);
		const existingMemo = await memoService.getMemoByUrl(normalizedUrl);

		if (existingMemo.error) {
			sendResponse({ success: false, error: existingMemo.error.message });
			return;
		}

		// Supabase는 결과가 없을 때 빈 배열을 돌려주므로 첫 번째 요소로 존재 여부를 판단한다.
		const currentMemo = existingMemo.data?.[0];

		if (currentMemo) {
			const updatedMemo = `${currentMemo.memo}${currentMemo.memo ? "\n\n" : ""}${payload.memo}`;
			const result = await memoService.updateMemo({
				id: currentMemo.id,
				request: { memo: updatedMemo },
			});

			if (result.error) {
				sendResponse({ success: false, error: result.error.message });
			} else {
				sendResponse({ success: true });
			}
		} else {
			const result = await memoService.insertMemo({
				...payload,
				url: normalizedUrl,
			});

			if (result.error) {
				sendResponse({ success: false, error: result.error.message });
			} else {
				sendResponse({ success: true });
			}
		}
	} catch (error) {
		sendResponse({
			success: false,
			error:
				error instanceof Error ? error.message : I18n.get("toast_error_save"),
		});
	}
});

// content-ui가 현재 페이지의 하이라이트를 조회한다.
// 실패해도 빈 배열을 돌려준다 — 남의 페이지 위에서 조용히 실패해야 한다(설계 §8).
bridge.handle.GET_HIGHLIGHTS_BY_URL(async (payload, _sender, sendResponse) => {
	try {
		const supabaseClient = await getSupabaseClient();
		const highlightService = new HighlightService(supabaseClient);

		// 앱·웹과 같은 기준으로 찾도록 URL을 정규화한다.
		const normalizedUrl = normalizeUrl(payload.url);
		const { data, error } =
			await highlightService.getHighlightsByUrl(normalizedUrl);

		if (error) {
			sendResponse({ highlights: [] });
			return;
		}

		sendResponse({ highlights: data ?? [] });
	} catch {
		sendResponse({ highlights: [] });
	}
});
