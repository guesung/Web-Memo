import { EXTENSION } from "../../constants";
import { Runtime, Tab } from "../../utils/extension";
import { BRIDGE_MESSAGE_TYPES } from "./constant";
import type {
	CreateMemoPayload,
	CreateMemoResponse,
	PageContent,
	YoutubeTranscriptResponse,
} from "./types";
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

	static async responsePageContent() {
		try {
			Runtime.onMessage(
				BRIDGE_MESSAGE_TYPES.PAGE_CONTENT,
				async (_, __, sendResponse) => {
					const content = ExtensionBridge._getContentFromWeb();

					try {
						sendResponse({ content });
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

	static async requestYoutubeTranscript(): Promise<YoutubeTranscriptResponse> {
		try {
			return await Tab.sendMessage<undefined, YoutubeTranscriptResponse>(
				BRIDGE_MESSAGE_TYPES.YOUTUBE_TRANSCRIPT,
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to request YouTube transcript",
				ExtensionErrorCode.YOUTUBE_ERROR,
				error,
			);
		}
	}

	static async responseYoutubeTranscript(
		extractFn: () => Promise<YoutubeTranscriptResponse>,
	) {
		try {
			Runtime.onMessage(
				BRIDGE_MESSAGE_TYPES.YOUTUBE_TRANSCRIPT,
				async (_, __, sendResponse) => {
					try {
						const result = await extractFn();
						sendResponse(result);
						return true;
					} catch (error) {
						sendResponse({
							success: false,
							transcript: "",
							error:
								error instanceof Error
									? error.message
									: "Failed to extract transcript",
						});
						return true;
					}
				},
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to setup YouTube transcript response handler",
				ExtensionErrorCode.YOUTUBE_ERROR,
				error,
			);
		}
	}

	static async requestRefetchTheMemosFromExtension() {
		try {
			return await Runtime.sendMessage(
				BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST_FROM_EXTENSION,
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to request memo list refresh",
				ExtensionErrorCode.COMMUNICATION_ERROR,
				error,
			);
		}
	}

	static responseRefetchTheMemosFromExtension(callbackFn: () => void) {
		try {
			return Runtime.onMessage(
				BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST_FROM_EXTENSION,
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

	static async requestRefetchTheMemosFromWeb() {
		try {
			console.log(1);
			return await chrome.runtime.sendMessage(EXTENSION.id, {
				type: BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST_FROM_WEB,
			});
		} catch (error) {
			throw new ExtensionError(
				"Failed to request memo list refresh",
				ExtensionErrorCode.COMMUNICATION_ERROR,
				error,
			);
		}
	}

	static responseRefetchTheMemosFromWeb(callbackFn: () => void) {
		try {
			return Runtime.onMessageExternal(
				BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST_FROM_WEB,
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

	/**
	 * 웹에서 익스텐션으로 로그인 상태 동기화 요청
	 */
	static async requestSyncLoginStatus() {
		try {
			return await chrome.runtime.sendMessage(EXTENSION.id, {
				type: BRIDGE_MESSAGE_TYPES.SYNC_LOGIN_STATUS,
			});
		} catch (error) {
			throw new ExtensionError(
				"Failed to request login status sync",
				ExtensionErrorCode.COMMUNICATION_ERROR,
				error,
			);
		}
	}

	/**
	 * 익스텐션에서 로그인 상태 동기화 요청 처리
	 */
	static responseSyncLoginStatus(callbackFn: () => void) {
		try {
			return Runtime.onMessageExternal(
				BRIDGE_MESSAGE_TYPES.SYNC_LOGIN_STATUS,
				callbackFn,
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to respond to login status sync request",
				ExtensionErrorCode.RUNTIME_ERROR,
				error,
			);
		}
	}

	/**
	 * content-ui에서 background로 메모 생성 요청
	 */
	static async requestCreateMemo(
		payload: CreateMemoPayload,
	): Promise<CreateMemoResponse> {
		try {
			return await Runtime.sendMessage<CreateMemoPayload, CreateMemoResponse>(
				BRIDGE_MESSAGE_TYPES.CREATE_MEMO,
				payload,
			);
		} catch (error) {
			throw new ExtensionError(
				"Failed to request memo creation",
				ExtensionErrorCode.COMMUNICATION_ERROR,
				error,
			);
		}
	}

	/**
	 * background에서 메모 생성 요청 처리
	 */
	static responseCreateMemo(
		callbackFn: (
			payload: CreateMemoPayload,
			sender: chrome.runtime.MessageSender,
			sendResponse: (response: CreateMemoResponse) => void,
		) => void,
	) {
		try {
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
		} catch (error) {
			throw new ExtensionError(
				"Failed to respond to memo creation request",
				ExtensionErrorCode.RUNTIME_ERROR,
				error,
			);
		}
	}
}
