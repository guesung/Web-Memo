import { EXTENSION } from "../../constants";
import { Runtime, Tab } from "../../utils/extension";
import { BRIDGE_MESSAGE_TYPES } from "./constant";
import type { BRIDGE_MESSAGE_TYPE } from "./type";
import type { PageContent } from "./types";
import { ExtensionError, ExtensionErrorCode } from "./types";

type MessageCallback<T = unknown> = (response: T) => void;
type MessageHandler = Parameters<typeof Runtime.onMessage>[1];

/**
 * ExtensionBridge provides a unified interface for communication
 * between different parts of the extension (web, background, content scripts)
 */
export default class ExtensionBridge {
	// ============================================================================
	// Error Handling Utilities
	// ============================================================================

	private static withErrorHandling<T>(
		fn: () => T,
		errorMessage: string,
		errorCode: ExtensionErrorCode,
	): T {
		try {
			return fn();
		} catch (error) {
			throw new ExtensionError(errorMessage, errorCode, error);
		}
	}

	private static async withAsyncErrorHandling<T>(
		fn: () => Promise<T>,
		errorMessage: string,
		errorCode: ExtensionErrorCode,
	): Promise<T> {
		try {
			return await fn();
		} catch (error) {
			throw new ExtensionError(errorMessage, errorCode, error);
		}
	}

	// ============================================================================
	// Message Handler Factories
	// ============================================================================

	private static createExternalRequest<T = unknown>(
		messageType: BRIDGE_MESSAGE_TYPE,
		callback: MessageCallback<T>,
		errorMessage: string,
	): void {
		this.withErrorHandling(
			() => {
				chrome.runtime.sendMessage(
					EXTENSION.id,
					{ type: messageType },
					callback,
				);
			},
			errorMessage,
			ExtensionErrorCode.COMMUNICATION_ERROR,
		);
	}

	private static createExternalResponse(
		messageType: BRIDGE_MESSAGE_TYPE,
		handler: MessageHandler,
		errorMessage: string,
	): void {
		this.withErrorHandling(
			() => Runtime.onMessageExternal(messageType, handler),
			errorMessage,
			ExtensionErrorCode.RUNTIME_ERROR,
		);
	}

	private static async createInternalRequest<T = unknown>(
		messageType: BRIDGE_MESSAGE_TYPE,
		errorMessage: string,
		errorCode: ExtensionErrorCode,
	): Promise<T> {
		return this.withAsyncErrorHandling(
			() => Runtime.sendMessage<null, T>(messageType),
			errorMessage,
			errorCode,
		);
	}

	private static createInternalResponse(
		messageType: BRIDGE_MESSAGE_TYPE,
		handler: MessageHandler,
		errorMessage: string,
	): void {
		this.withErrorHandling(
			() => Runtime.onMessage(messageType, handler),
			errorMessage,
			ExtensionErrorCode.RUNTIME_ERROR,
		);
	}

	// ============================================================================
	// Side Panel Operations
	// ============================================================================

	/**
	 * Request to check if side panel is open (external communication)
	 */
	static requestGetSidePanelOpen(callback: MessageCallback<boolean>): void {
		this.createExternalRequest(
			BRIDGE_MESSAGE_TYPES.GET_SIDE_PANEL_OPEN,
			callback,
			"Failed to request side panel open status",
		);
	}

	/**
	 * Respond to side panel open status requests (from extension)
	 */
	static responseGetSidePanelOpen(): void {
		this.createExternalResponse(
			BRIDGE_MESSAGE_TYPES.GET_SIDE_PANEL_OPEN,
			(_, __, sendResponse) => {
				sendResponse(true);
			},
			"Failed to respond to side panel open status request",
		);
	}

	/**
	 * Request to open the side panel
	 */
	static async requestOpenSidePanel(): Promise<unknown> {
		return this.createInternalRequest(
			BRIDGE_MESSAGE_TYPES.OPEN_SIDE_PANEL,
			"Failed to request side panel open",
			ExtensionErrorCode.RUNTIME_ERROR,
		);
	}

	/**
	 * Respond to side panel open requests
	 */
	static responseOpenSidePanel(): void {
		this.withErrorHandling(
			() => {
				chrome.runtime.onMessage.addListener((request, sender) => {
					if (request.type !== BRIDGE_MESSAGE_TYPES.OPEN_SIDE_PANEL) {
						return;
					}

					if (!sender.tab?.windowId) {
						throw new ExtensionError(
							"No window ID found",
							ExtensionErrorCode.TAB_ERROR,
						);
					}

					chrome.sidePanel.open({ windowId: sender.tab.windowId });
				});
			},
			"Failed to respond to open side panel request",
			ExtensionErrorCode.RUNTIME_ERROR,
		);
	}

	/**
	 * Request to update the side panel
	 */
	static async requestUpdateSidePanel(): Promise<unknown> {
		return this.createInternalRequest(
			BRIDGE_MESSAGE_TYPES.UPDATE_SIDE_PANEL,
			"Failed to request side panel update",
			ExtensionErrorCode.COMMUNICATION_ERROR,
		);
	}

	/**
	 * Respond to side panel update requests
	 */
	static responseUpdateSidePanel(callback: MessageHandler): void {
		this.createInternalResponse(
			BRIDGE_MESSAGE_TYPES.UPDATE_SIDE_PANEL,
			callback,
			"Failed to respond to side panel update request",
		);
	}

	// ============================================================================
	// Tab Operations
	// ============================================================================

	/**
	 * Request to get current tabs
	 */
	static async requestGetTabs(): Promise<chrome.tabs.Tab> {
		return this.createInternalRequest(
			BRIDGE_MESSAGE_TYPES.GET_TABS,
			"Failed to request tabs",
			ExtensionErrorCode.TAB_ERROR,
		);
	}

	/**
	 * Respond to tab requests
	 */
	static async responseGetTabs(): Promise<void> {
		return this.withAsyncErrorHandling(
			async () => {
				const tabs = await Tab.get();
				Runtime.onMessage(
					BRIDGE_MESSAGE_TYPES.GET_TABS,
					(_, __, sendResponse) => {
						sendResponse(tabs);
					},
				);
			},
			"Failed to respond to get tabs request",
			ExtensionErrorCode.TAB_ERROR,
		);
	}

	// ============================================================================
	// Page Content Operations
	// ============================================================================

	/**
	 * Request to get page content from the active tab
	 */
	static async requestPageContent(): Promise<PageContent> {
		return this.withAsyncErrorHandling(
			() => Tab.sendMessage<void, PageContent>(BRIDGE_MESSAGE_TYPES.PAGE_CONTENT),
			"Failed to request page content",
			ExtensionErrorCode.CONTENT_ERROR,
		);
	}

	/**
	 * Respond to page content requests
	 */
	static responsePageContent(): void {
		this.withErrorHandling(
			() => {
				Runtime.onMessage(
					BRIDGE_MESSAGE_TYPES.PAGE_CONTENT,
					async (_, __, sendResponse) => {
						const content = this.extractPageContent();

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
			},
			"Failed to process page content response",
			ExtensionErrorCode.CONTENT_ERROR,
		);
	}

	/**
	 * Extract content from the current web page
	 * Includes main body text and iframe content if available
	 */
	private static extractPageContent(): string {
		return this.withErrorHandling(
			() => {
				const bodyText = document.body.innerText;
				const iframeText =
					document.querySelector("iframe")?.contentWindow?.document?.body
						?.innerText;

				if (!bodyText && !iframeText) {
					return "";
				}

				return iframeText ? `${bodyText}\n${iframeText}` : bodyText;
			},
			"Failed to extract web content",
			ExtensionErrorCode.CONTENT_ERROR,
		);
	}

	// ============================================================================
	// Memo Operations
	// ============================================================================

	/**
	 * Request to refetch the memo list (external communication)
	 */
	static async requestRefetchTheMemos(): Promise<unknown> {
		return this.withAsyncErrorHandling(
			async () =>
				chrome.runtime.sendMessage(EXTENSION.id, {
					type: BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST,
				}),
			"Failed to request memo list refresh",
			ExtensionErrorCode.COMMUNICATION_ERROR,
		);
	}

	/**
	 * Respond to memo list refetch requests (from extension)
	 */
	static responseRefetchTheMemos(callback: () => void): void {
		this.createExternalResponse(
			BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST,
			callback,
			"Failed to respond to memo list refresh request",
		);
	}

	// ============================================================================
	// Extension Manifest Operations
	// ============================================================================

	/**
	 * Request to get the extension manifest (external communication)
	 */
	static requestGetExtensionManifest(
		callback: MessageCallback<chrome.runtime.Manifest>,
	): void {
		this.createExternalRequest(
			BRIDGE_MESSAGE_TYPES.GET_EXTENSION_MANIFEST,
			callback,
			"Failed to request extension manifest",
		);
	}

	/**
	 * Respond to extension manifest requests (from extension)
	 */
	static responseGetExtensionManifest(): void {
		this.withErrorHandling(
			() => {
				const manifest = chrome.runtime.getManifest();
				Runtime.onMessageExternal(
					BRIDGE_MESSAGE_TYPES.GET_EXTENSION_MANIFEST,
					(_, __, sendResponse) => sendResponse(manifest),
				);
			},
			"Failed to respond to extension manifest request",
			ExtensionErrorCode.RUNTIME_ERROR,
		);
	}

	// ============================================================================
	// Login Status Synchronization
	// ============================================================================

	/**
	 * Request to synchronize login status from web to extension
	 */
	static async requestSyncLoginStatus(): Promise<unknown> {
		return this.withAsyncErrorHandling(
			async () =>
				chrome.runtime.sendMessage(EXTENSION.id, {
					type: BRIDGE_MESSAGE_TYPES.SYNC_LOGIN_STATUS,
				}),
			"Failed to request login status sync",
			ExtensionErrorCode.COMMUNICATION_ERROR,
		);
	}

	/**
	 * Respond to login status synchronization requests (from extension)
	 */
	static responseSyncLoginStatus(callback: () => void): void {
		this.createExternalResponse(
			BRIDGE_MESSAGE_TYPES.SYNC_LOGIN_STATUS,
			callback,
			"Failed to respond to login status sync request",
		);
	}
}
