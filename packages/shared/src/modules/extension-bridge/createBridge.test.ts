import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bridge } from "./bridge";
import { createBridge, defineMessage } from "./createBridge";

const NO_RECEIVER = new Error(
	"Could not establish connection. Receiving end does not exist.",
);
const sendMessage = vi.fn();
const sendTabMessage = vi.fn();
const queryTabs = vi.fn();
const addListener = vi.fn();
const addExternalListener = vi.fn();
const reportFailure = vi.fn();
const reportHandlerError = vi.fn();
beforeEach(() => {
	vi.useFakeTimers();
	vi.resetAllMocks();
	vi.stubGlobal("chrome", {
		runtime: {
			sendMessage,
			onMessage: { addListener, removeListener: vi.fn() },
			onMessageExternal: {
				addListener: addExternalListener,
				removeListener: vi.fn(),
			},
		},
		tabs: { query: queryTabs, sendMessage: sendTabMessage },
	});
	queryTabs.mockResolvedValue([{ id: 0 }]);
	bridge.setFailureReporter(reportFailure);
	bridge.setHandlerErrorReporter(reportHandlerError);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("bridge request lifecycle", () => {
	it("rejects explicitly when extension APIs are unavailable", async () => {
		vi.stubGlobal("chrome", undefined);
		await expect(bridge.request.GET_SIDE_PANEL_OPEN()).rejects.toMatchObject({
			code: "ExtensionUnavailable",
		});
		expect(reportFailure).toHaveBeenCalledTimes(1);
		expect(reportFailure).toHaveBeenCalledWith({
			messageType: "GET_SIDE_PANEL_OPEN",
			direction: "toExtension",
			classification: "ExtensionUnavailable",
		});
	});

	it.each([false, 0, "", null, undefined])(
		"preserves a normal falsy response: %s",
		async (value) => {
			sendTabMessage.mockResolvedValue(value);
			await expect(bridge.request.PAGE_CONTENT()).resolves.toBe(value);
			expect(reportFailure).not.toHaveBeenCalled();
			expect(vi.getTimerCount()).toBe(0);
		},
	);

	it("retries receiver absence once against the same tab", async () => {
		sendTabMessage
			.mockRejectedValueOnce(NO_RECEIVER)
			.mockResolvedValueOnce("ok");
		await expect(bridge.request.PAGE_CONTENT()).resolves.toBe("ok");
		expect(queryTabs).toHaveBeenCalledTimes(1);
		expect(sendTabMessage.mock.calls.map((call) => call[0])).toEqual([0, 0]);
		expect(reportFailure).not.toHaveBeenCalled();
	});

	it("reports only the final receiver failure", async () => {
		sendMessage.mockRejectedValue(NO_RECEIVER);
		await expect(bridge.request.GET_SIDE_PANEL_OPEN()).rejects.toMatchObject({
			code: "NoReceiver",
		});
		expect(sendMessage).toHaveBeenCalledTimes(2);
		expect(reportFailure).toHaveBeenCalledTimes(1);
		expect(sendMessage.mock.calls[0]).toEqual(sendMessage.mock.calls[1]);
	});

	it("classifies an empty tab query as NoReceiver", async () => {
		queryTabs.mockResolvedValue([]);
		await expect(bridge.request.PAGE_CONTENT()).rejects.toMatchObject({
			code: "NoReceiver",
		});
		expect(sendTabMessage).not.toHaveBeenCalled();
	});

	it("preserves unknown errors without retrying or exposing payload", async () => {
		const originalError = new Error("private URL");
		sendMessage.mockRejectedValue(originalError);
		const customBridge = createBridge({
			CREATE_MEMO: defineMessage<string>("internal"),
		});
		customBridge.setFailureReporter(reportFailure);
		await expect(
			customBridge.request.CREATE_MEMO("private payload"),
		).rejects.toBe(originalError);
		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(reportFailure).toHaveBeenCalledTimes(1);
		expect(reportFailure).toHaveBeenCalledWith({
			messageType: "CREATE_MEMO",
			direction: "internal",
			classification: "Unknown",
		});
	});

	it.each([
		["GET_TABS", 10_000],
		["GET_HIGHLIGHTS_BY_URL", 30_000],
		["YOUTUBE_TRANSCRIPT", 75_000],
	] as const)(
		"applies the configured deadline for %s",
		async (messageType, timeoutMs) => {
			sendMessage.mockImplementation(() => new Promise(() => {}));
			sendTabMessage.mockImplementation(() => new Promise(() => {}));
			const request =
				messageType === "GET_HIGHLIGHTS_BY_URL"
					? bridge.request.GET_HIGHLIGHTS_BY_URL({ url: "https://example.com" })
					: bridge.request[messageType]();
			const assertion = expect(request).rejects.toMatchObject({
				code: "Timeout",
			});
			await vi.advanceTimersByTimeAsync(timeoutMs - 1);
			expect(reportFailure).not.toHaveBeenCalled();
			await vi.advanceTimersByTimeAsync(1);
			await assertion;
			expect(reportFailure).toHaveBeenCalledTimes(1);
			expect(vi.getTimerCount()).toBe(0);
		},
	);

	it("includes retry time in the original deadline and ignores late rejection", async () => {
		let rejectFirst: (error: Error) => void = () => {};
		let rejectSecond: (error: Error) => void = () => {};
		sendMessage
			.mockImplementationOnce(
				() =>
					new Promise((_resolve, reject) => {
						rejectFirst = reject;
					}),
			)
			.mockImplementationOnce(
				() =>
					new Promise((_resolve, reject) => {
						rejectSecond = reject;
					}),
			);
		const assertion = expect(bridge.request.GET_TABS()).rejects.toMatchObject({
			code: "Timeout",
		});
		await vi.advanceTimersByTimeAsync(9_000);
		rejectFirst(NO_RECEIVER);
		await vi.advanceTimersByTimeAsync(1_000);
		await assertion;
		rejectSecond(NO_RECEIVER);
		await vi.advanceTimersByTimeAsync(0);
		expect(sendMessage).toHaveBeenCalledTimes(2);
		expect(reportFailure).toHaveBeenCalledTimes(1);
	});

	it("does not send after a late tab lookup", async () => {
		let resolveTabs: (tabs: { id: number }[]) => void = () => {};
		queryTabs.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveTabs = resolve;
				}),
		);
		const assertion = expect(
			bridge.request.PAGE_CONTENT(),
		).rejects.toMatchObject({ code: "Timeout" });
		await vi.advanceTimersByTimeAsync(10_000);
		await assertion;
		resolveTabs([{ id: 5 }]);
		await vi.advanceTimersByTimeAsync(0);
		expect(sendTabMessage).not.toHaveBeenCalled();
	});

	it("accepts a void notification transport result without an application ACK", async () => {
		sendMessage.mockResolvedValue(undefined);
		await expect(bridge.request.UPDATE_SIDE_PANEL()).resolves.toBeUndefined();
		expect(reportFailure).not.toHaveBeenCalled();
	});

	it.each(["throw", "reject"])(
		"classifies invalidated contexts from %s",
		async (failureMode) => {
			const originalError = new Error("Extension context invalidated.");
			sendMessage.mockImplementation(() => {
				if (failureMode === "throw") {
					throw originalError;
				}

				return Promise.reject(originalError);
			});
			await expect(bridge.request.GET_TABS()).rejects.toMatchObject({
				code: "ExtensionUnavailable",
			});
			expect(reportFailure).toHaveBeenCalledWith({
				messageType: "GET_TABS",
				direction: "internal",
				classification: "ExtensionUnavailable",
			});
			expect(sendMessage).toHaveBeenCalledTimes(1);
		},
	);

	it("ignores success arriving after the deadline", async () => {
		let resolveResponse: (value: boolean) => void = () => {};
		sendMessage.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveResponse = resolve;
				}),
		);
		const assertion = expect(
			bridge.request.GET_SIDE_PANEL_OPEN(),
		).rejects.toMatchObject({ code: "Timeout" });
		await vi.advanceTimersByTimeAsync(10_000);
		await assertion;
		resolveResponse(false);
		await vi.advanceTimersByTimeAsync(0);
		expect(reportFailure).toHaveBeenCalledTimes(1);
		expect(sendMessage).toHaveBeenCalledTimes(1);
	});

	it("does not let a diagnostic reporter replace the original error", async () => {
		const originalError = new Error("original");
		sendMessage.mockRejectedValue(originalError);
		bridge.setFailureReporter(() => {
			throw new Error("reporter failed");
		});
		await expect(bridge.request.GET_TABS()).rejects.toBe(originalError);
	});
});

describe("message listener contracts", () => {
	it("keeps external async response listeners open but ignores other message types", () => {
		bridge.handle.GET_SIDE_PANEL_OPEN(
			async (_payload, _sender, sendResponse) => {
				sendResponse(false);
			},
		);
		const listener = addExternalListener.mock.calls[0][0];
		const sendResponse = vi.fn();
		expect(listener({ type: "GET_SIDE_PANEL_OPEN" }, {}, sendResponse)).toBe(
			true,
		);
		expect(sendResponse).toHaveBeenCalledWith(false);
		expect(listener({ type: "OTHER" }, {}, sendResponse)).toBe(false);
	});

	it.each(["internal", "toExtension"] as const)(
		"observes %s handler rejection without fabricating a response",
		async (direction) => {
			const customBridge = createBridge({ GET_TABS: defineMessage(direction) });
			const originalError = new Error("handler failed");
			customBridge.handle.GET_TABS(async () => {
				throw originalError;
			});
			const listeners =
				direction === "internal" ? addListener : addExternalListener;
			const listener = listeners.mock.calls[0][0];
			const sendResponse = vi.fn();
			expect(listener({ type: "GET_TABS" }, {}, sendResponse)).toBe(true);
			await vi.advanceTimersByTimeAsync(0);
			expect(reportHandlerError).toHaveBeenCalledTimes(1);
			expect(reportHandlerError).toHaveBeenCalledWith(originalError);
			expect(sendResponse).not.toHaveBeenCalled();
		},
	);

	it("observes rejected notification work without keeping its channel alive", async () => {
		const originalError = new Error("notification failed");
		bridge.handle.UPDATE_SIDE_PANEL(async () => {
			throw originalError;
		});
		const listener = addListener.mock.calls[0][0];
		const sendResponse = vi.fn();
		expect(
			listener({ type: "UPDATE_SIDE_PANEL" }, {}, sendResponse),
		).toBeUndefined();
		await vi.advanceTimersByTimeAsync(0);
		expect(reportHandlerError).toHaveBeenCalledWith(originalError);
		expect(sendResponse).not.toHaveBeenCalled();
	});

	it("does not hold a notification channel for follow-up async work", () => {
		bridge.handle.REFETCH_THE_MEMO_LIST_FROM_EXTENSION(async () => {
			await new Promise(() => {});
		});
		const listener = addListener.mock.calls[0][0];
		expect(
			listener({ type: "REFETCH_THE_MEMO_LIST_FROM_EXTENSION" }, {}, vi.fn()),
		).toBeUndefined();
	});
});
