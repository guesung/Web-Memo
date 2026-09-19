import { handleEditHighlight } from "./editHighlight";
import { handleCreateHighlight } from "./createHighlight";
import "webextension-polyfill";

import { captureException } from "@sentry/react";
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
import { initSentry } from "@web-memo/shared/utils";
import { analytics } from "@web-memo/shared/modules/analytics";

const FEATURE_NAME = "memo";
const OPERATION_NAME = "create-memo";

void initSentry();

const reportMemoCreateError = (error: unknown, stage: string) => {
	captureException(error instanceof Error ? error : new Error(String(error)), {
		level: "error",
		tags: {
			feature: FEATURE_NAME,
			operation: OPERATION_NAME,
			stage,
		},
		fingerprint: [FEATURE_NAME, OPERATION_NAME, stage],
		extra: { feature: FEATURE_NAME, operation: OPERATION_NAME, stage },
	});
};

// 확장 프로그램이 설치되었을 때 옵션을 초기화한다.
chrome.runtime.onInstalled.addListener(async (details) => {
	// 퍼널의 출발점입니다. 설치 대비 사이드패널 사용, 가입 전환을 여기서부터 셉니다.
	// await로 붙잡아야 합니다. service worker는 할 일이 없으면 곧바로 종료되어,
	// 전송이 끝나기 전에 워커가 죽으면 이벤트가 조용히 사라집니다.
	try {
		await analytics.trackEvent({
			name: "extension_installed",
			params: { reason: details.reason },
		});
	} catch (error) {
		// 계측 실패가 패널 설정·언어 초기화·설치 탭을 막으면 안 되므로 삼킵니다.
		console.warn("[analytics] extension_installed 전송에 실패했습니다.", error);
	}

	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
	const language = await ChromeSyncStorage.get(STORAGE_KEYS.language);
	const uiLanguage = I18n.getUILanguage();
	if (!language) ChromeSyncStorage.set(STORAGE_KEYS.language, uiLanguage);

	// 처음 설치했을 때만 웹을 열어 로그인으로 이어지게 합니다. 업데이트에서는 열지 않습니다.
	if (details.reason === "install") {
		await openMemosTabOnInstall();
	}
});

/**
 * 설치 직후 웹의 메모 페이지를 새 탭으로 엽니다.
 * @description 확장의 client_id를 `ext_cid`로 실어 보내 웹 가입까지 한 사용자로 이어 집계합니다.
 * client_id를 얻지 못하면 `ext_cid` 없이 엽니다.
 */
const openMemosTabOnInstall = async () => {
	const memosUrl = new URL(`${CONFIG.webUrl}/memos`);
	const clientId = await analytics.getExtensionClientId();

	if (clientId) {
		memosUrl.searchParams.set("ext_cid", clientId);
	}

	await Tab.create({ url: memosUrl.toString() });
};

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
				analytics.trackEvent({
					name: "open_web_from_extension",
					params: { from: "context_menu" },
				});
				await Tab.create({ url: `${CONFIG.webUrl}/memos` });
				break;
			case CONTEXT_MENU_ID_SHOW_GUIDE:
				analytics.trackEvent({ name: "guide_open", params: { from: "context_menu" } });
				if (I18n.getUILanguage() === "ko") Tab.create({ url: EXTERNAL_LINK.notionGuideKo });
				else Tab.create({ url: EXTERNAL_LINK.notionGuideEn });
				break;
		}
	});

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
			reportMemoCreateError(existingMemo.error, "lookup");
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
				reportMemoCreateError(result.error, "update");
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
				reportMemoCreateError(result.error, "insert");
				sendResponse({ success: false, error: result.error.message });
			} else {
				sendResponse({ success: true });
			}
		}
	} catch (error) {
		reportMemoCreateError(error, "handler");
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

/** 선택된 텍스트는 인증된 background에서만 저장한다. */
bridge.handle.CREATE_HIGHLIGHT(async (payload, sender, sendResponse) => {
 sendResponse(await handleCreateHighlight({ payload, sender }));
});

bridge.handle.EDIT_HIGHLIGHT(async (payload, sender, sendResponse) => {
	sendResponse(await handleEditHighlight({ payload, sender }));
});
