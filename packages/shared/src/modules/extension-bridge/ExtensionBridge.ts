import { EXTENSION } from "../../constants";
import { Runtime, Tab } from "../../utils/extension";
import { BRIDGE_MESSAGE_TYPES } from "./constant";
import type { PageContent } from "./types";
import { ExtensionError, ExtensionErrorCode } from "./types";

/**
 * ExtensionBridge - Chrome Extension 메시지 통신을 위한 중앙 관리 클래스
 *
 * 리팩토링 노트:
 * - 중복된 try-catch 패턴을 헬퍼 메서드로 추출
 * - 에러 처리를 중앙화하여 일관성 유지
 * - 타입 안정성 강화
 */
export default class ExtensionBridge {
	// ========================================
	// Private Helper Methods
	// ========================================

	/**
	 * 외부 메시지 전송을 위한 헬퍼 (callback 기반)
	 */
	private static _sendExternalMessage<T = void>(
		type: string,
		errorMessage: string,
		callback?: (response: T) => void,
	): void {
		try {
			if (callback) {
				chrome.runtime.sendMessage(EXTENSION.id, { type }, callback);
			} else {
				chrome.runtime.sendMessage(EXTENSION.id, { type });
			}
		} catch (error) {
			throw new ExtensionError(
				errorMessage,
				ExtensionErrorCode.COMMUNICATION_ERROR,
				error,
			);
		}
	}

	/**
	 * 내부 런타임 메시지 전송을 위한 헬퍼 (Promise 기반)
	 */
	private static async _sendRuntimeMessage<TRequest = void, TResponse = void>(
		type: string,
		errorMessage: string,
		errorCode: ExtensionErrorCode = ExtensionErrorCode.RUNTIME_ERROR,
	): Promise<TResponse> {
		try {
			return await Runtime.sendMessage<TRequest, TResponse>(type);
		} catch (error) {
			throw new ExtensionError(errorMessage, errorCode, error);
		}
	}

	/**
	 * 탭 메시지 전송을 위한 헬퍼 (Promise 기반)
	 */
	private static async _sendTabMessage<TRequest = void, TResponse = void>(
		type: string,
		errorMessage: string,
		errorCode: ExtensionErrorCode = ExtensionErrorCode.CONTENT_ERROR,
	): Promise<TResponse> {
		try {
			return await Tab.sendMessage<TRequest, TResponse>(type);
		} catch (error) {
			throw new ExtensionError(errorMessage, errorCode, error);
		}
	}

	/**
	 * 외부 메시지 리스너 등록을 위한 헬퍼
	 */
	private static _listenExternalMessage(
		type: string,
		errorMessage: string,
		handler: Parameters<typeof Runtime.onMessageExternal>[1],
	): void {
		try {
			Runtime.onMessageExternal(type, handler);
		} catch (error) {
			throw new ExtensionError(
				errorMessage,
				ExtensionErrorCode.RUNTIME_ERROR,
				error,
			);
		}
	}

	/**
	 * 내부 메시지 리스너 등록을 위한 헬퍼
	 */
	private static _listenMessage(
		type: string,
		errorMessage: string,
		handler: Parameters<typeof Runtime.onMessage>[1],
	): void {
		try {
			Runtime.onMessage(type, handler);
		} catch (error) {
			throw new ExtensionError(
				errorMessage,
				ExtensionErrorCode.RUNTIME_ERROR,
				error,
			);
		}
	}

	// ========================================
	// Side Panel - Open Status
	// ========================================

	static async requestGetSidePanelOpen(callbackFn: () => void): Promise<void> {
		this._sendExternalMessage(
			BRIDGE_MESSAGE_TYPES.GET_SIDE_PANEL_OPEN,
			"Failed to request side panel open status",
			callbackFn,
		);
	}

	static responseGetSidePanelOpen(): void {
		this._listenExternalMessage(
			BRIDGE_MESSAGE_TYPES.GET_SIDE_PANEL_OPEN,
			"Failed to respond to side panel open status request",
			(_, __, sendResponse) => {
				sendResponse(true);
			},
		);
	}

	// ========================================
	// Side Panel - Open Action
	// ========================================

	static async requestOpenSidePanel(): Promise<void> {
		return this._sendRuntimeMessage(
			BRIDGE_MESSAGE_TYPES.OPEN_SIDE_PANEL,
			"Failed to request side panel open",
		);
	}

	static responseOpenSidePanel(): void {
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

	// ========================================
	// Tabs
	// ========================================

	static async requestGetTabs(): Promise<chrome.tabs.Tab> {
		return this._sendRuntimeMessage<null, chrome.tabs.Tab>(
			BRIDGE_MESSAGE_TYPES.GET_TABS,
			"Failed to request tabs",
			ExtensionErrorCode.TAB_ERROR,
		);
	}

	static async responseGetTabs(): Promise<void> {
		try {
			const tabs = await Tab.get();
			this._listenMessage(
				BRIDGE_MESSAGE_TYPES.GET_TABS,
				"Failed to respond to get tabs request",
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

	// ========================================
	// Page Content
	// ========================================

	static async requestPageContent(): Promise<PageContent> {
		return this._sendTabMessage<void, PageContent>(
			BRIDGE_MESSAGE_TYPES.PAGE_CONTENT,
			"Failed to request page content",
		);
	}

	static async responsePageContent(): Promise<void> {
		try {
			this._listenMessage(
				BRIDGE_MESSAGE_TYPES.PAGE_CONTENT,
				"Failed to process page content response",
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

	private static _getContentFromWeb(): string {
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

	// ========================================
	// Memo List - Refetch
	// ========================================

	static async requestRefetchTheMemos(): Promise<void> {
		this._sendExternalMessage(
			BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST,
			"Failed to request memo list refresh",
		);
	}

	static responseRefetchTheMemos(callbackFn: () => void): void {
		this._listenExternalMessage(
			BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST,
			"Failed to respond to memo list refresh request",
			callbackFn,
		);
	}

	// ========================================
	// Side Panel - Update
	// ========================================

	static async requestUpdateSidePanel(): Promise<void> {
		return this._sendRuntimeMessage(
			BRIDGE_MESSAGE_TYPES.UPDATE_SIDE_PANEL,
			"Failed to request side panel update",
			ExtensionErrorCode.COMMUNICATION_ERROR,
		);
	}

	static responseUpdateSidePanel(
		callbackFn: Parameters<typeof Runtime.onMessage>[1],
	): void {
		this._listenMessage(
			BRIDGE_MESSAGE_TYPES.UPDATE_SIDE_PANEL,
			"Failed to respond to side panel update request",
			callbackFn,
		);
	}

	// ========================================
	// Extension Manifest
	// ========================================

	static async requestGetExtensionManifest(
		callbackFn: (response: chrome.runtime.Manifest) => void,
	): Promise<void> {
		this._sendExternalMessage<chrome.runtime.Manifest>(
			BRIDGE_MESSAGE_TYPES.GET_EXTENSION_MANIFEST,
			"Failed to request extension manifest",
			callbackFn,
		);
	}

	static responseGetExtensionManifest(): void {
		try {
			const manifest = chrome.runtime.getManifest();
			this._listenExternalMessage(
				BRIDGE_MESSAGE_TYPES.GET_EXTENSION_MANIFEST,
				"Failed to respond to extension manifest request",
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

	// ========================================
	// Auth - Login Status Sync
	// ========================================

	/**
	 * 웹에서 익스텐션으로 로그인 상태 동기화 요청
	 */
	static async requestSyncLoginStatus(): Promise<void> {
		this._sendExternalMessage(
			BRIDGE_MESSAGE_TYPES.SYNC_LOGIN_STATUS,
			"Failed to request login status sync",
		);
	}

	/**
	 * 익스텐션에서 로그인 상태 동기화 요청 처리
	 */
	static responseSyncLoginStatus(callbackFn: () => void): void {
		this._listenExternalMessage(
			BRIDGE_MESSAGE_TYPES.SYNC_LOGIN_STATUS,
			"Failed to respond to login status sync request",
			callbackFn,
		);
	}
}
