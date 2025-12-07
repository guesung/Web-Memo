import { EXTENSION } from "../../../constants";
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

	static sendMessageToExtension<TResponse>(
		type: BRIDGE_MESSAGE_TYPE,
	): Promise<TResponse>;
	static sendMessageToExtension<TResponse>(
		type: BRIDGE_MESSAGE_TYPE,
		callback: (response: TResponse) => void,
	): void;
	static sendMessageToExtension<TResponse>(
		type: BRIDGE_MESSAGE_TYPE,
		callback?: (response: TResponse) => void,
	): Promise<TResponse> | void {
		if (callback) {
			chrome.runtime.sendMessage(EXTENSION.id, { type }, callback);
		} else {
			return chrome.runtime.sendMessage(EXTENSION.id, { type });
		}
	}

	static onMessage<TPayload, TResponse>(
		type: BRIDGE_MESSAGE_TYPE,
		callback: (
			request: BridgeRequest<TPayload>,
			sender: chrome.runtime.MessageSender,
			sendResponse: (response: TResponse) => void,
		) => void | boolean | Promise<unknown>,
	) {
		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
			if (request.type === type) {
				const result = callback(request, sender, sendResponse);
				// 비동기 콜백의 경우 true를 반환하여 sendResponse를 유지
				if (result instanceof Promise) {
					return true;
				}
				return result;
			}
			return false;
		});
	}

	static onMessageExternal<TPayload, TResponse>(
		type: BRIDGE_MESSAGE_TYPE,
		callback: (
			request: BridgeRequest<TPayload>,
			sender: chrome.runtime.MessageSender,
			sendResponse: (response: TResponse) => void,
		) => void,
	) {
		chrome.runtime.onMessageExternal.addListener(
			(request, sender, sendResponse) => {
				if (request.type === type) {
					callback(request, sender, sendResponse);
				}
			},
		);
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
