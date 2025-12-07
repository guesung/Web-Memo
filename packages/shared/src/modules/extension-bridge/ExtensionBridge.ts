import { EXTENSION } from "../../constants";
import { Runtime, Tab } from "../../utils/extension";
import { BRIDGE_MESSAGE_TYPES } from "./constant";
import type {
	CreateMemoPayload,
	CreateMemoResponse,
	PageContent,
	YoutubeTranscriptResponse,
} from "./types";

export default class ExtensionBridge {
	static requestGetSidePanelOpen(callbackFn: () => void) {
		chrome.runtime.sendMessage(
			EXTENSION.id,
			{ type: BRIDGE_MESSAGE_TYPES.GET_SIDE_PANEL_OPEN },
			callbackFn,
		);
	}

	static responseGetSidePanelOpen() {
		Runtime.onMessageExternal(
			BRIDGE_MESSAGE_TYPES.GET_SIDE_PANEL_OPEN,
			(_, __, sendResponse) => {
				sendResponse(true);
			},
		);
	}

	static async requestOpenSidePanel() {
		return Runtime.sendMessage(BRIDGE_MESSAGE_TYPES.OPEN_SIDE_PANEL);
	}

	static responseOpenSidePanel() {
		chrome.runtime.onMessage.addListener((request, sender) => {
			if (request.type === BRIDGE_MESSAGE_TYPES.OPEN_SIDE_PANEL) {
				if (!sender.tab?.windowId) return;
				chrome.sidePanel.open({ windowId: sender.tab.windowId });
			}
		});
	}

	static async requestGetTabs() {
		return Runtime.sendMessage<null, chrome.tabs.Tab>(
			BRIDGE_MESSAGE_TYPES.GET_TABS,
		);
	}

	static async responseGetTabs() {
		const tabs = await Tab.get();
		Runtime.onMessage(BRIDGE_MESSAGE_TYPES.GET_TABS, (_, __, sendResponse) => {
			sendResponse(tabs);
		});
	}

	static async requestPageContent(): Promise<PageContent> {
		return Tab.sendMessage<void, PageContent>(
			BRIDGE_MESSAGE_TYPES.PAGE_CONTENT,
		);
	}

	static responsePageContent() {
		Runtime.onMessage(
			BRIDGE_MESSAGE_TYPES.PAGE_CONTENT,
			(_, __, sendResponse) => {
				const content = ExtensionBridge._getContentFromWeb();
				sendResponse({ content });
				return true;
			},
		);
	}

	private static _getContentFromWeb() {
		const text = document.body.innerText;
		if (text) return text;

		try {
			const iframeText =
				document.querySelector("iframe")?.contentWindow?.document?.body
					?.innerText;
			return text + (iframeText ? `\n${iframeText}` : "");
		} catch {
			// cross-origin iframe 접근 시 에러 무시
			return text;
		}
	}

	static async requestYoutubeTranscript(): Promise<YoutubeTranscriptResponse> {
		return Tab.sendMessage<undefined, YoutubeTranscriptResponse>(
			BRIDGE_MESSAGE_TYPES.YOUTUBE_TRANSCRIPT,
		);
	}

	static responseYoutubeTranscript(
		extractFn: () => Promise<YoutubeTranscriptResponse>,
	) {
		Runtime.onMessage(
			BRIDGE_MESSAGE_TYPES.YOUTUBE_TRANSCRIPT,
			async (_, __, sendResponse) => {
				try {
					const result = await extractFn();
					sendResponse(result);
				} catch (error) {
					sendResponse({
						success: false,
						transcript: "",
						error:
							error instanceof Error
								? error.message
								: "Failed to extract transcript",
					});
				}
				return true;
			},
		);
	}

	static async requestRefetchTheMemosFromExtension() {
		return Runtime.sendMessage(
			BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST_FROM_EXTENSION,
		);
	}

	static responseRefetchTheMemosFromExtension(callbackFn: () => void) {
		return Runtime.onMessage(
			BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST_FROM_EXTENSION,
			callbackFn,
		);
	}

	static async requestRefetchTheMemosFromWeb() {
		return chrome.runtime.sendMessage(EXTENSION.id, {
			type: BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST_FROM_WEB,
		});
	}

	static responseRefetchTheMemosFromWeb(callbackFn: () => void) {
		return Runtime.onMessageExternal(
			BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST_FROM_WEB,
			callbackFn,
		);
	}

	static async requestUpdateSidePanel() {
		return Runtime.sendMessage(BRIDGE_MESSAGE_TYPES.UPDATE_SIDE_PANEL);
	}

	static responseUpdateSidePanel(
		callbackFn: Parameters<typeof Runtime.onMessage>[1],
	) {
		return Runtime.onMessage(
			BRIDGE_MESSAGE_TYPES.UPDATE_SIDE_PANEL,
			callbackFn,
		);
	}

	static requestGetExtensionManifest(
		callbackFn: (response: chrome.runtime.Manifest) => void,
	) {
		chrome.runtime.sendMessage(
			EXTENSION.id,
			{ type: BRIDGE_MESSAGE_TYPES.GET_EXTENSION_MANIFEST },
			callbackFn,
		);
	}

	static responseGetExtensionManifest() {
		const manifest = chrome.runtime.getManifest();
		Runtime.onMessageExternal(
			BRIDGE_MESSAGE_TYPES.GET_EXTENSION_MANIFEST,
			(_, __, sendResponse) => sendResponse(manifest),
		);
	}

	static async requestSyncLoginStatus() {
		return chrome.runtime.sendMessage(EXTENSION.id, {
			type: BRIDGE_MESSAGE_TYPES.SYNC_LOGIN_STATUS,
		});
	}

	static responseSyncLoginStatus(callbackFn: () => void) {
		return Runtime.onMessageExternal(
			BRIDGE_MESSAGE_TYPES.SYNC_LOGIN_STATUS,
			callbackFn,
		);
	}

	static async requestCreateMemo(
		payload: CreateMemoPayload,
	): Promise<CreateMemoResponse> {
		return Runtime.sendMessage<CreateMemoPayload, CreateMemoResponse>(
			BRIDGE_MESSAGE_TYPES.CREATE_MEMO,
			payload,
		);
	}

	static responseCreateMemo(
		callbackFn: (
			payload: CreateMemoPayload,
			sender: chrome.runtime.MessageSender,
			sendResponse: (response: CreateMemoResponse) => void,
		) => void,
	) {
		return Runtime.onMessage(
			BRIDGE_MESSAGE_TYPES.CREATE_MEMO,
			(request, sender, sendResponse) => {
				callbackFn(
					request.payload as CreateMemoPayload,
					sender,
					sendResponse,
				);
			},
		);
	}
}
