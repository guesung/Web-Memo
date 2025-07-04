import { YoutubeTranscript } from "youtube-transcript";
import { EXTENSION } from "../../constants";
import { Runtime, Tab } from "../../utils/extension";

import type { Category } from "./constant";
import { BRIDGE_MESSAGE_TYPES } from "./constant";
import type { PageContent } from "./types";
import { ExtensionError, ExtensionErrorCode } from "./types";

export default class ExtensionBridge {
	static async requestGetSidePanelOpen(callbackFn: () => void) {
		try {
			chrome.runtime.sendMessage(
				EXTENSION.id,
				{
					type: BRIDGE_MESSAGE_TYPES.GET_SIDE_PANEL_OPEN,
				},
				callbackFn,
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to request side panel open status",
				ExtensionErrorCode.COMMUNICATION_ERROR,
				error,
			);
		}
	}

	static responseGetSidePanelOpen() {
		try {
			Runtime.onMessageExternal(
				BRIDGE_MESSAGE_TYPES.GET_SIDE_PANEL_OPEN,
				(_, __, sendResponse) => {
					sendResponse(true);
				},
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to respond to side panel open status request",
				ExtensionErrorCode.RUNTIME_ERROR,
				error,
			);
		}
	}

	static async requestOpenSidePanel() {
		try {
			return await Runtime.sendMessage(BRIDGE_MESSAGE_TYPES.OPEN_SIDE_PANEL);
		} catch (error) {
			throw new ExtensionError(
				"Failed to request side panel open",
				ExtensionErrorCode.RUNTIME_ERROR,
				error,
			);
		}
	}

	static responseOpenSidePanel() {
		try {
			chrome.runtime.onMessage.addListener((request, sender) => {
				if (request.type === BRIDGE_MESSAGE_TYPES.OPEN_SIDE_PANEL) {
					if (!sender.tab?.windowId) {
						throw new ExtensionError(
							"No window ID found",
							ExtensionErrorCode.TAB_ERROR,
						);
					}
					chrome.sidePanel.open({ windowId: sender.tab.windowId });
				}
			});
		} catch (error) {
			throw new ExtensionError(
				"Failed to respond to open side panel request",
				ExtensionErrorCode.RUNTIME_ERROR,
				error,
			);
		}
	}

	static async requestGetTabs() {
		try {
			return await Runtime.sendMessage<null, chrome.tabs.Tab>(
				BRIDGE_MESSAGE_TYPES.GET_TABS,
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to request tabs",
				ExtensionErrorCode.TAB_ERROR,
				error,
			);
		}
	}

	static async responseGetTabs() {
		try {
			const tabs = await Tab.get();
			Runtime.onMessage(
				BRIDGE_MESSAGE_TYPES.GET_TABS,
				(_, __, sendResponse) => {
					sendResponse(tabs);
				},
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to respond to get tabs request",
				ExtensionErrorCode.TAB_ERROR,
				error,
			);
		}
	}

	static async requestPageContent(): Promise<PageContent> {
		try {
			return await Tab.sendMessage<void, PageContent>(
				BRIDGE_MESSAGE_TYPES.PAGE_CONTENT,
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to request page content",
				ExtensionErrorCode.CONTENT_ERROR,
				error,
			);
		}
	}

	private static checkYoutube(url: string): boolean {
		const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
		return youtubeRegex.test(url);
	}

	private static getCategory(url: string): Category {
		if (ExtensionBridge.checkYoutube(url)) return "youtube";
		return "others";
	}

	static async responsePageContent() {
		try {
			const url = location.href;
			const category = ExtensionBridge.getCategory(url);
			const content = await ExtensionBridge._getContent(url, category);

			Runtime.onMessage(
				BRIDGE_MESSAGE_TYPES.PAGE_CONTENT,
				async (_, __, sendResponse) => {
					try {
						sendResponse({ content, category });
						return true;
					} catch (error) {
						throw new ExtensionError(
							"Failed to send page content response",
							ExtensionErrorCode.CONTENT_ERROR,
							error,
						);
					}
				},
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to process page content response",
				ExtensionErrorCode.CONTENT_ERROR,
				error,
			);
		}
	}

	private static async _getContent(url: string, category: Category) {
		try {
			if (category === "youtube")
				return await ExtensionBridge._getContentFromYoutube(url);
			return ExtensionBridge._getContentFromWeb();
		} catch (error) {
			throw new ExtensionError(
				"Failed to get content",
				ExtensionErrorCode.CONTENT_ERROR,
				error,
			);
		}
	}

	private static async _getContentFromYoutube(url: string) {
		try {
			const transcripts = await YoutubeTranscript.fetchTranscript(url);
			return transcripts.map((transcript) => transcript.text).join("\n");
		} catch (error) {
			throw new ExtensionError(
				"Failed to get YouTube transcript",
				ExtensionErrorCode.YOUTUBE_ERROR,
				error,
			);
		}
	}

	private static _getContentFromWeb() {
		try {
			const text = document.body.innerText;
			if (text) return text;

			const iframeText =
				document.querySelector("iframe")?.contentWindow?.document?.body
					?.innerText;
			return text + (iframeText ? "\n" + iframeText : "");
		} catch (error) {
			throw new ExtensionError(
				"Failed to get web content",
				ExtensionErrorCode.CONTENT_ERROR,
				error,
			);
		}
	}

	static async requestRefetchTheMemos() {
		try {
			return await chrome.runtime.sendMessage(EXTENSION.id, {
				type: BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST,
			});
		} catch (error) {
			throw new ExtensionError(
				"Failed to request memo list refresh",
				ExtensionErrorCode.COMMUNICATION_ERROR,
				error,
			);
		}
	}

	static responseRefetchTheMemos(callbackFn: () => void) {
		try {
			return Runtime.onMessageExternal(
				BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST,
				callbackFn,
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to respond to memo list refresh request",
				ExtensionErrorCode.RUNTIME_ERROR,
				error,
			);
		}
	}

	static async requestUpdateSidePanel() {
		try {
			return await Runtime.sendMessage(BRIDGE_MESSAGE_TYPES.UPDATE_SIDE_PANEL);
		} catch (error) {
			throw new ExtensionError(
				"Failed to request side panel update",
				ExtensionErrorCode.COMMUNICATION_ERROR,
				error,
			);
		}
	}

	static responseUpdateSidePanel(
		callbackFn: Parameters<typeof Runtime.onMessage>[1],
	) {
		try {
			return Runtime.onMessage(
				BRIDGE_MESSAGE_TYPES.UPDATE_SIDE_PANEL,
				callbackFn,
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to respond to side panel update request",
				ExtensionErrorCode.RUNTIME_ERROR,
				error,
			);
		}
	}

	static async requestGetExtensionManifest(
		callbackFn: (response: chrome.runtime.Manifest) => void,
	) {
		try {
			chrome.runtime.sendMessage(
				EXTENSION.id,
				{ type: BRIDGE_MESSAGE_TYPES.GET_EXTENSION_MANIFEST },
				callbackFn,
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to request extension manifest",
				ExtensionErrorCode.RUNTIME_ERROR,
				error,
			);
		}
	}

	static responseGetExtensionManifest() {
		try {
			const manifest = chrome.runtime.getManifest();
			Runtime.onMessageExternal(
				BRIDGE_MESSAGE_TYPES.GET_EXTENSION_MANIFEST,
				(_, __, sendResponse) => sendResponse(manifest),
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to respond to extension manifest request",
				ExtensionErrorCode.RUNTIME_ERROR,
				error,
			);
		}
	}
}
