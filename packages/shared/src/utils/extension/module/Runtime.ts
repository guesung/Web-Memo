import { CHROME_EXTENSION_ID } from "../../../constants";
import type {
	BRIDGE_MESSAGE_TYPE,
	BridgeRequest,
} from "../../../modules/extension-bridge";

export class Runtime {
	static sendMessage<TPayload, TResponse>(
		type: BRIDGE_MESSAGE_TYPE,
		payload?: TPayload,
	): Promise<TResponse> {
		return chrome.runtime.sendMessage<BridgeRequest<TPayload>, TResponse>({
			type,
			payload,
		});
	}

	/** 웹 페이지에서 허용된 확장 메시지를 payload와 함께 전송합니다. */
	static sendMessageToExtension<TPayload, TResponse>(
		type: BRIDGE_MESSAGE_TYPE,
		payload?: TPayload,
	): Promise<TResponse> {
		return chrome.runtime.sendMessage(CHROME_EXTENSION_ID, { type, payload });
	}

	static onMessage<TPayload, TResponse>(
		type: BRIDGE_MESSAGE_TYPE,
		callback: (
			request: BridgeRequest<TPayload>,
			sender: chrome.runtime.MessageSender,
			sendResponse: (response: TResponse) => void,
		) => undefined | boolean | Promise<unknown>,
	) {
		const listener = (
			request: BridgeRequest<TPayload>,
			sender: chrome.runtime.MessageSender,
			sendResponse: (response: TResponse) => void,
		) => {
			if (request.type === type) {
				const result = callback(request, sender, sendResponse);
				// 비동기 콜백의 경우 true를 반환하여 sendResponse를 유지
				if (result instanceof Promise) {
					return true;
				}
				return result;
			}
			return false;
		};

		chrome.runtime.onMessage.addListener(listener);

		return () => chrome.runtime.onMessage.removeListener(listener);
	}

	static onMessageExternal<TPayload, TResponse>(
		type: BRIDGE_MESSAGE_TYPE,
		callback: (
			request: BridgeRequest<TPayload>,
			sender: chrome.runtime.MessageSender,
			sendResponse: (response: TResponse) => void,
		) => undefined | boolean | Promise<unknown>,
	) {
		const listener = (
			request: BridgeRequest<TPayload>,
			sender: chrome.runtime.MessageSender,
			sendResponse: (response: TResponse) => void,
		) => {
			if (request.type === type) {
				const result = callback(request, sender, sendResponse);
				if (result instanceof Promise) {
					return true;
				}
				return result;
			}
			return false;
		};

		chrome.runtime.onMessageExternal.addListener(listener);

		return () => chrome.runtime.onMessageExternal.removeListener(listener);
	}

	static async connect<TPayload>(
		type: BRIDGE_MESSAGE_TYPE,
		payload: TPayload,
		callbackFn: (message: string) => void,
	): Promise<void> {
		return new Promise((resolve) => {
			const port = chrome.runtime.connect({ name: type });
			port.postMessage(payload);
			port.onMessage.addListener(async (message) => {
				if (message === null) resolve();
				callbackFn(message);
			});
		});
	}

	static async onConnect(
		callbackFn: (port: chrome.runtime.Port) => void,
	): Promise<void> {
		chrome.runtime.onConnect.addListener(callbackFn);
	}
}
