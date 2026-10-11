import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type { TCreateHighlightResponse } from "@web-memo/shared/modules/extension-bridge";
import { getPageKey } from "@web-memo/shared/utils";

/** 닫힌 패널의 알림 실패가 저장 성공을 뒤집지 않게 한다. */
export async function notifyHighlightChange(result: TCreateHighlightResponse) {
	if (!result.success) return;
	try {
		await bridge.request.HIGHLIGHTS_CHANGED({
			pageKey: getPageKey(result.highlight.url),
		});
	} catch {
		// 패널이 닫혀 있으면 다음 열기에서 다시 조회한다.
	}
}

/** 클릭 시점에 보던 탭을 고정하고 수신 페이지에서도 페이지 키를 검증한다. */
export async function handleFocusHighlight(
	payload: { tabId: number; pageKey: string; id: number },
	sender: chrome.runtime.MessageSender,
): Promise<{ success: boolean }> {
	if (
		sender.id !== chrome.runtime.id ||
		!payload ||
		!Number.isSafeInteger(payload.tabId) ||
		payload.tabId < 0 ||
		!Number.isSafeInteger(payload.id) ||
		payload.id <= 0 ||
		typeof payload.pageKey !== "string"
	)
		return { success: false };
	try {
		const tab = await chrome.tabs.get(payload.tabId);
		if (!tab.active || !tab.url || getPageKey(tab.url) !== payload.pageKey) {
			return { success: false };
		}
		const response = await chrome.tabs.sendMessage(payload.tabId, {
			type: "SCROLL_TO_HIGHLIGHT",
			payload: { pageKey: payload.pageKey, id: payload.id },
		});
		return { success: response?.success === true };
	} catch {
		return { success: false };
	}
}
