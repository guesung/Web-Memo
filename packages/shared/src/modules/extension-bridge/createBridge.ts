import { Runtime, Tab } from "../../utils/extension";
import type { BRIDGE_MESSAGE_TYPE } from "./type";

type MessageDirection = "internal" | "toExtension" | "toTab";

interface MessageDefinition<TPayload = void, TResponse = void> {
	direction: MessageDirection;
	_payload?: TPayload;
	_response?: TResponse;
}

type ExtractPayload<T> = T extends MessageDefinition<infer P, unknown>
	? P
	: never;
type ExtractResponse<T> = T extends MessageDefinition<unknown, infer R>
	? R
	: never;

type RequestFn<TPayload, TResponse> = TPayload extends void
	? () => Promise<TResponse>
	: (payload: TPayload) => Promise<TResponse>;

type HandleCallback<TPayload, TResponse> =
	| ((
			payload: TPayload,
			sender: chrome.runtime.MessageSender,
			sendResponse: (response: TResponse) => void,
	  ) => void | boolean | Promise<void> | Promise<boolean>)
	| (() => void);

type HandleFn<TPayload, TResponse> = (
	callback: HandleCallback<TPayload, TResponse>,
) => () => void;

type BridgeAPI<T extends Record<string, MessageDefinition<unknown, unknown>>> =
	{
		request: {
			[K in keyof T]: RequestFn<ExtractPayload<T[K]>, ExtractResponse<T[K]>>;
		};
		handle: {
			[K in keyof T]: HandleFn<ExtractPayload<T[K]>, ExtractResponse<T[K]>>;
		};
	};

export function defineMessage<TPayload = void, TResponse = void>(
	direction: MessageDirection,
): MessageDefinition<TPayload, TResponse> {
	return { direction } as MessageDefinition<TPayload, TResponse>;
}

function isChromeExtensionEnvironment(): boolean {
	return typeof chrome !== "undefined" && !!chrome.runtime;
}

export function createBridge<
	T extends Record<string, MessageDefinition<unknown, unknown>>,
>(schema: T): BridgeAPI<T> {
	const request = {} as BridgeAPI<T>["request"];
	const handle = {} as BridgeAPI<T>["handle"];

	for (const [key, def] of Object.entries(schema)) {
		const messageType = key as BRIDGE_MESSAGE_TYPE;
		const { direction } = def;

		// Request 함수 생성
		(request as Record<string, unknown>)[key] = ((payload?: unknown) => {
			if (!isChromeExtensionEnvironment()) {
				return Promise.resolve(undefined);
			}

			switch (direction) {
				case "internal":
					return Runtime.sendMessage(messageType, payload);
				case "toExtension":
					return Runtime.sendMessageToExtension(messageType);
				case "toTab":
					return Tab.sendMessage(messageType, payload);
			}
		}) as RequestFn<unknown, unknown>;

		// Handle 함수 생성
		(handle as Record<string, unknown>)[key] = ((
			callback: HandleCallback<unknown, unknown>,
		) => {
			if (!isChromeExtensionEnvironment()) {
				return () => {};
			}

			const wrappedCallback = (
				_request: { payload?: unknown },
				sender: chrome.runtime.MessageSender,
				sendResponse: (response: unknown) => void,
			): undefined | boolean | Promise<unknown> => {
				return callback(_request.payload, sender, sendResponse) ?? undefined;
			};

			switch (direction) {
				case "internal":
					return Runtime.onMessage(messageType, wrappedCallback);
				case "toExtension":
					return Runtime.onMessageExternal(messageType, wrappedCallback);
				case "toTab":
					return Runtime.onMessage(messageType, wrappedCallback);
			}
		}) as HandleFn<unknown, unknown>;
	}

	return { request, handle };
}
