import "webextension-polyfill";

import { CONFIG } from "@web-memo/env";
import { DEFAULT_PROMPTS, URL } from "@web-memo/shared/constants";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { isProduction, MemoService } from "@web-memo/shared/utils";
import { getSupabaseClient, I18n, Tab } from "@web-memo/shared/utils/extension";

// 확장 프로그램이 설치되었을 때 옵션을 초기화한다.
chrome.runtime.onInstalled.addListener(async () => {
	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
	const language = await ChromeSyncStorage.get(STORAGE_KEYS.language);
	const youtubePrompts = await ChromeSyncStorage.get(
		STORAGE_KEYS.youtubePrompts,
	);
	const webPrompts = await ChromeSyncStorage.get(STORAGE_KEYS.webPrompts);

	const uiLanguage = I18n.getUILanguage();
	if (!language) ChromeSyncStorage.set(STORAGE_KEYS.language, uiLanguage);
	if (!youtubePrompts) {
		if (uiLanguage === "ko")
			ChromeSyncStorage.set(
				STORAGE_KEYS.youtubePrompts,
				DEFAULT_PROMPTS.youtube.ko,
			);
		else
			ChromeSyncStorage.set(
				STORAGE_KEYS.youtubePrompts,
				DEFAULT_PROMPTS.youtube.en,
			);
	}
	if (!webPrompts) {
		if (uiLanguage === "ko")
			ChromeSyncStorage.set(STORAGE_KEYS.webPrompts, DEFAULT_PROMPTS.web.ko);
		else ChromeSyncStorage.set(STORAGE_KEYS.webPrompts, DEFAULT_PROMPTS.web.en);
	}
});

// 확장 프로그램이 설치되었을 때 가이드 페이지로 이동한다.
chrome.runtime.onInstalled.addListener(async () => {
	if (!isProduction) return;
	await Tab.create({ url: `${CONFIG.webUrl}/login` });
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
				if (I18n.getUILanguage() === "ko") Tab.create({ url: URL.guideKo });
				else Tab.create({ url: URL.guideEn });
				break;
		}
	});

chrome.runtime.setUninstallURL(URL.googleForm);

chrome.tabs.onActivated.addListener(async () => {
	// 활성화된 탭이 변경되었을 때 사이드 패널을 업데이트한다.
	ExtensionBridge.requestUpdateSidePanel();
});
chrome.tabs.onUpdated.addListener(async () => {
	// 페이지를 이동했을 때 사이드 패널을 업데이트한다.
	ExtensionBridge.requestUpdateSidePanel();
});

// content-ui에서 메시지를 전달받아 사이드 패널을 연다.
ExtensionBridge.responseOpenSidePanel();

ExtensionBridge.responseGetExtensionManifest();

ExtensionBridge.responseGetTabs();

// content-ui에서 메모 생성 요청을 받아 처리한다.
ExtensionBridge.responseCreateMemo(async (payload, _sender, sendResponse) => {
	try {
		const supabaseClient = await getSupabaseClient();
		const memoService = new MemoService(supabaseClient);
		const result = await memoService.insertMemo(payload);

		if (result.error) {
			sendResponse({ success: false, error: result.error.message });
		} else {
			sendResponse({ success: true });
		}
	} catch (error) {
		sendResponse({
			success: false,
			error: error instanceof Error ? error.message : "메모 생성에 실패했습니다.",
		});
	}
	return true;
});
