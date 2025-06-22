import "webextension-polyfill";

import { CONFIG } from "@extension/env";
import { DEFAULT_PROMPTS, URL } from "@extension/shared/constants";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@extension/shared/modules/chrome-storage";
import { ExtensionBridge } from "@extension/shared/modules/extension-bridge";
import { isProduction } from "@extension/shared/utils";
import { getSystemPrompt, I18n, Tab } from "@extension/shared/utils/extension";
import { openai } from "@root/utils/openai";

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

// chatGPT에게서 메시지를 받아서 다시 전달한다.
chrome.runtime.onConnect.addListener(async (port) => {
	port.onMessage.addListener(async (message) => {
		const { category, pageContent } = message;

		const language = await ChromeSyncStorage.get<string>(STORAGE_KEYS.language);
		const prompt = await getSystemPrompt({ language, category });

		const stream = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{ role: "system", content: prompt },
				{ role: "user", content: pageContent },
			],
			stream: true,
		});

		for await (const chunk of stream) {
			const message = chunk.choices[0]?.delta?.content;
			port.postMessage(message);
		}
	});
});

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
