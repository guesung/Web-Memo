import "webextension-polyfill";

import { CONFIG } from "@web-memo/env";
import { EXTERNAL_LINK } from "@web-memo/shared/constants";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import {
	BRIDGE_MESSAGE_TYPES,
	bridge,
} from "@web-memo/shared/modules/extension-bridge";
import {
	HighlightService,
	MemoService,
	normalizeUrl,
} from "@web-memo/shared/utils";
import { getSupabaseClient, I18n, Tab } from "@web-memo/shared/utils/extension";
import { analytics } from "@web-memo/shared/modules/analytics";

const SIDE_PANEL_UNSUPPORTED_KEY = "isSidePanelUnsupported";
const SIDE_PANEL_OPEN_TIMEOUT_MS = 1000;

// Arc는 chrome.sidePanel을 노출하지만 open()이 에러 없이 영원히 끝나지 않는다.
// 그래서 API 존재 여부로는 못 가르고, 실제로 열리는지를 보고 내린 판정을 기기(storage.local)에 기억한다.
// sync 저장소에 두면 Arc에서 내린 판정이 같은 계정의 Chrome으로 넘어간다.
// 서비스 워커가 깨어난 직후엔 아직 읽기 전이라 undefined다.
let isSidePanelUnsupported: boolean | undefined;

const loadIsSidePanelUnsupported = async () => {
	const stored = await chrome.storage.local.get(SIDE_PANEL_UNSUPPORTED_KEY);
	isSidePanelUnsupported = stored[SIDE_PANEL_UNSUPPORTED_KEY] === true;
};
const isSidePanelUnsupportedLoading = loadIsSidePanelUnsupported();

const saveIsSidePanelUnsupported = async (isUnsupported: boolean) => {
	isSidePanelUnsupported = isUnsupported;
	await chrome.storage.local.set({
		[SIDE_PANEL_UNSUPPORTED_KEY]: isUnsupported,
	});
};

const openSidePanel = async (windowId: number) => {
	try {
		await chrome.sidePanel.open({ windowId });
		return "opened" as const;
	} catch {
		return "failed" as const;
	}
};

const waitForSidePanelOpenTimeout = async () => {
	await new Promise((resolve) =>
		setTimeout(resolve, SIDE_PANEL_OPEN_TIMEOUT_MS),
	);

	return "timeout" as const;
};

// 서비스 워커가 막 깨어나 판정을 아직 못 읽었을 때를 위한 경로다.
// 저장된 판정이 "안 된다"면 타임아웃을 기다리지 않고 바로 폴백하고, 아니면 끝나지 않는다.
const waitForStoredUnsupported = async () => {
	await isSidePanelUnsupportedLoading;
	if (isSidePanelUnsupported) {
		return "unsupported" as const;
	}

	return new Promise<never>(() => {});
};

const toggleFloatingPanel = async (tabId: number) => {
	try {
		await chrome.tabs.sendMessage(tabId, {
			type: BRIDGE_MESSAGE_TYPES.TOGGLE_FLOATING_PANEL,
		});
	} catch {
		// content script가 없는 탭(chrome:// 등)에는 띄울 곳이 없다.
	}
};

const openMemoPanel = async (tab: chrome.tabs.Tab) => {
	if (tab.id === undefined) {
		return;
	}

	if (isSidePanelUnsupported) {
		await toggleFloatingPanel(tab.id);
		return;
	}

	// sidePanel.open은 사용자 제스처 안에서만 동작하므로 어떤 await보다 먼저 부른다.
	const sidePanelOpening = openSidePanel(tab.windowId);
	const outcome = await Promise.race([
		sidePanelOpening,
		waitForSidePanelOpenTimeout(),
		waitForStoredUnsupported(),
	]);

	// reject는 제스처 누락 같은 일시적 실패일 수 있어 폴백하지 않는다.
	if (outcome === "opened" || outcome === "failed") {
		return;
	}

	await toggleFloatingPanel(tab.id);
	if (outcome === "unsupported") {
		return;
	}

	await saveIsSidePanelUnsupported(true);
	// 느렸을 뿐 결국 열렸다면 오판이므로 기록을 되돌린다.
	if ((await sidePanelOpening) === "opened") {
		await saveIsSidePanelUnsupported(false);
	}
};

// 확장 프로그램이 설치되었을 때 옵션을 초기화한다.
chrome.runtime.onInstalled.addListener(async () => {
	// 퍼널의 출발점입니다. 설치 대비 사이드패널 사용, 가입 전환을 여기서부터 셉니다.
	// await로 붙잡아야 합니다. service worker는 할 일이 없으면 곧바로 종료되어,
	// 전송이 끝나기 전에 워커가 죽으면 이벤트가 조용히 사라집니다.
	await analytics.trackEvent({ name: "extension_installed" });

	// 아이콘 클릭은 action.onClicked에서 직접 처리한다. 브라우저에 맡기면 사이드 패널이
	// 동작하지 않는 Arc에서 클릭이 아무 반응 없이 삼켜진다.
	// 이전 버전이 켜 둔 값이 남아 있어 업데이트 때도 끈다. Arc에서는 끝나지 않을 수 있어 기다리지 않는다.
	chrome.sidePanel
		.setPanelBehavior({ openPanelOnActionClick: false })
		.catch(() => {});
	// 사이드 패널 판정은 버전마다 다시 한다. 느린 기기에서 한 번 오판한 기록이 영구히 남지 않게 한다.
	await saveIsSidePanelUnsupported(false);
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

// 아이콘 클릭(Alt+S 포함)과 content-ui의 요청을 같은 경로로 연다.
chrome.action.onClicked.addListener((tab) => {
	openMemoPanel(tab);
});
bridge.handle.OPEN_SIDE_PANEL((_, sender) => {
	if (!sender.tab) return;
	openMemoPanel(sender.tab);
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
