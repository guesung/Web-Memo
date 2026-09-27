import { captureException } from "@sentry/react";
import { CHROME_EXTENSION_ID } from "../../../constants";
import type {
	BRIDGE_MESSAGE_TYPE,
	BridgeRequest,
} from "../../../modules/extension-bridge";
import { createErrorReporter } from "../../errorReporter";

const REPORT_HANDLER_ERROR = createErrorReporter({ capture: captureException });

/** Chrome runtime 메시지 전송과 수신 등록. */
export class Runtime {
	private static messageErrorReporter = (error: unknown): void => {
		REPORT_HANDLER_ERROR({
			error,
			feature: "extension-bridge",
			operation: "handle",
			stage: "listener",
		});
	};

	static setMessageErrorReporter = (
		reporter: (error: unknown) => void,
	): void => {
		Runtime.messageErrorReporter = reporter;
	};

	static observeMessageResult = async (
		result: Promise<unknown>,
	): Promise<void> => {
		try {
			await result;
		} catch (error) {
			try {
				Runtime.messageErrorReporter(error);
			} catch {
				// 오류 수집기의 실패를 새로운 unhandled rejection으로 전파하지 않습니다.
			}
		}
	};

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
		payload?: unknown,
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
					void Runtime.observeMessageResult(result);

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
					void Runtime.observeMessageResult(result);

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
