import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Runtime } from "./Runtime";

vi.mock("../../../constants", () => ({ CHROME_EXTENSION_ID: "extension-id" }));

describe("Runtime.onMessageExternal", () => {
	const addListener = vi.fn();
	const removeListener = vi.fn();
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("chrome", {
			runtime: { onMessageExternal: { addListener, removeListener } },
		});
	});
	afterEach(() => vi.unstubAllGlobals());

	test("외부 요청 핸들러를 즉시 호출하고 비동기 응답 채널을 유지한다", async () => {
		const sendResponse = vi.fn();
		const callback = vi.fn((_request, _sender, respond) => {
			void Promise.resolve().then(() => respond({ success: true }));
			return true;
		});
		const cleanup = Runtime.onMessageExternal(
			"OPEN_SIDE_PANEL_FROM_WEB",
			callback,
		);
		const listener = addListener.mock.calls[0][0];
		const request = { type: "OPEN_SIDE_PANEL_FROM_WEB" };
		const sender = { origin: "https://www.webmemo.xyz" };
		expect(listener(request, sender, sendResponse)).toBe(true);
		expect(callback).toHaveBeenCalledWith(request, sender, sendResponse);
		expect(sendResponse).not.toHaveBeenCalled();
		await Promise.resolve();
		expect(sendResponse).toHaveBeenCalledWith({ success: true });
		cleanup();
		expect(removeListener).toHaveBeenCalledWith(listener);
	});

	test("다른 메시지는 처리하지 않고 동기 거절을 보존한다", () => {
		const callback = vi.fn(() => false);
		Runtime.onMessageExternal("OPEN_SIDE_PANEL_FROM_WEB", callback);
		const listener = addListener.mock.calls[0][0];
		expect(listener({ type: "GET_TABS" }, {}, vi.fn())).toBe(false);
		expect(callback).not.toHaveBeenCalled();
		expect(listener({ type: "OPEN_SIDE_PANEL_FROM_WEB" }, {}, vi.fn())).toBe(
			false,
		);
	});

	test("Promise 핸들러도 응답 채널을 유지한다", () => {
		Runtime.onMessageExternal(
			"OPEN_SIDE_PANEL_FROM_WEB",
			async () => undefined,
		);
		expect(
			addListener.mock.calls[0][0](
				{ type: "OPEN_SIDE_PANEL_FROM_WEB" },
				{},
				vi.fn(),
			),
		).toBe(true);
	});
});
