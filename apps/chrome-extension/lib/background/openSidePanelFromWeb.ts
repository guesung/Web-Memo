import { CONFIG } from "@web-memo/env";

type OpenSidePanelResponse = { success: boolean };

export const handleOpenSidePanelFromWeb = (
	_payload: void,
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: OpenSidePanelResponse) => void,
): boolean => {
	let senderOrigin: string;
	try {
		senderOrigin = new URL(sender.url ?? "").origin;
	} catch {
		sendResponse({ success: false });
		return false;
	}

	const windowId = sender.tab?.windowId;
	if (
		senderOrigin !== new URL(CONFIG.webUrl).origin ||
		(sender.origin !== undefined && sender.origin !== senderOrigin) ||
		typeof windowId !== "number" ||
		!Number.isInteger(windowId) ||
		windowId < 0
	) {
		sendResponse({ success: false });
		return false;
	}

	try {
		chrome.sidePanel.open({ windowId }).then(
			() => sendResponse({ success: true }),
			() => sendResponse({ success: false }),
		);
		return true;
	} catch {
		sendResponse({ success: false });
		return false;
	}
};
