import { addBreadcrumb } from "@sentry/react";
import { Runtime } from "../../utils/extension/module/Runtime";
import {
	executeBridgeRequest,
	type IFBridgeFailure,
	type TMessageDirection,
} from "./executeBridgeRequest";
import type { BRIDGE_MESSAGE_TYPE } from "./type";

/** 런타임 정책과 컴파일타임 payload/response 계약. */
interface IFMessageDefinition<TPayload = void, TResponse = void> {
	direction: TMessageDirection;
	timeoutMs: number;
	notification: boolean;
	_payload?: TPayload;
	_response?: TResponse;
}

/** 메시지 계약에서 유도한 브리지 API 타입. */
type TExtractPayload<T> = T extends IFMessageDefinition<infer P, unknown>
	? P
	: never;
/** 메시지 계약에서 유도한 브리지 API 타입. */
type TExtractResponse<T> = T extends IFMessageDefinition<unknown, infer R>
	? R
	: never;

/** 메시지 계약에서 유도한 브리지 API 타입. */
type TRequestFn<TPayload, TResponse> = TPayload extends void
	? () => Promise<TResponse>
	: (payload: TPayload) => Promise<TResponse>;

/** 메시지 계약에서 유도한 브리지 API 타입. */
type THandleCallback<TPayload, TResponse> =
	| ((
			payload: TPayload,
			sender: chrome.runtime.MessageSender,
			sendResponse: (response: TResponse) => void,
	  ) => void | boolean | Promise<void> | Promise<boolean>)
	| (() => void);

/** 메시지 계약에서 유도한 브리지 API 타입. */
type THandleFn<TPayload, TResponse> = (
	callback: THandleCallback<TPayload, TResponse>,
) => () => void;

/** 메시지 계약에서 유도한 브리지 API 타입. */
type TBridgeAPI<
	T extends Record<string, IFMessageDefinition<unknown, unknown>>,
> = {
	setFailureReporter: (reporter: (failure: IFBridgeFailure) => void) => void;
	setHandlerErrorReporter: (reporter: (error: unknown) => void) => void;
	request: {
		[K in keyof T]: TRequestFn<TExtractPayload<T[K]>, TExtractResponse<T[K]>>;
	};
	handle: {
		[K in keyof T]: THandleFn<TExtractPayload<T[K]>, TExtractResponse<T[K]>>;
	};
};

/** 메시지 방향과 요청 전체 기한을 선언합니다. */
export const defineMessage = <TPayload = void, TResponse = void>(
	direction: TMessageDirection,
	options: { timeoutMs?: number; notification?: boolean } = {},
): IFMessageDefinition<TPayload, TResponse> => ({
	direction,
	timeoutMs: options.timeoutMs ?? 10_000,
	notification: options.notification ?? false,
});

const isChromeExtensionEnvironment = (): boolean =>
	typeof chrome !== "undefined" && !!chrome.runtime;

/** 타입 지정 요청과 수신자 등록 API를 생성합니다. */
export const createBridge = <
	T extends Record<string, IFMessageDefinition<unknown, unknown>>,
>(
	schema: T,
): TBridgeAPI<T> => {
	let reportFailure = (failure: IFBridgeFailure) => {
		addBreadcrumb({
			category: "extension.bridge",
			level: "warning",
			data: failure,
		});
	};
	const setFailureReporter = (reporter: (failure: IFBridgeFailure) => void) => {
		reportFailure = reporter;
	};

	const request = {} as TBridgeAPI<T>["request"];
	const handle = {} as TBridgeAPI<T>["handle"];

	for (const [key, def] of Object.entries(schema)) {
		const messageType = key as BRIDGE_MESSAGE_TYPE;
		const { direction } = def;

		// Request 함수 생성
		(request as Record<string, unknown>)[key] = ((payload?: unknown) => {
			return executeBridgeRequest({
				messageType,
				direction,
				payload,
				timeoutMs: def.timeoutMs,
				reportFailure,
			});
		}) as TRequestFn<unknown, unknown>;

		// Handle 함수 생성
		(handle as Record<string, unknown>)[key] = ((
			callback: THandleCallback<unknown, unknown>,
		) => {
			if (!isChromeExtensionEnvironment()) {
				return () => {};
			}

			const wrappedCallback = (
				_request: { payload?: unknown },
				sender: chrome.runtime.MessageSender,
				sendResponse: (response: unknown) => void,
			): undefined | boolean | Promise<unknown> => {
				const result = callback(_request.payload, sender, sendResponse);
				if (def.notification) {
					if (result instanceof Promise) {
						void Runtime.observeMessageResult(result);
					}

					return undefined;
				}

				return result ?? undefined;
			};

			switch (direction) {
				case "internal":
					return Runtime.onMessage(messageType, wrappedCallback);
				case "toExtension":
					return Runtime.onMessageExternal(messageType, wrappedCallback);
				case "toTab":
					return Runtime.onMessage(messageType, wrappedCallback);
			}
		}) as THandleFn<unknown, unknown>;
	}

	return {
		request,
		handle,
		setFailureReporter,
		setHandlerErrorReporter: Runtime.setMessageErrorReporter,
	};
};
