import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBridge, defineMessage } from "./createBridge";

const mocks = vi.hoisted(() => ({
	internal: vi.fn(),
	external: vi.fn(),
	tab: vi.fn(),
	onMessage: vi.fn(),
	onMessageExternal: vi.fn(),
}));
vi.mock("../../utils/extension", () => ({
	Runtime: {
		sendMessage: mocks.internal,
		sendMessageToExtension: mocks.external,
		onMessage: mocks.onMessage,
		onMessageExternal: mocks.onMessageExternal,
	},
	Tab: { sendMessage: mocks.tab },
}));

const schema = {
	OPEN_SIDE_PANEL: defineMessage<{ token: string }, string>("internal"),
	GET_SIDE_PANEL_OPEN: defineMessage<void, string>("toExtension"),
	PAGE_CONTENT: defineMessage<{ url: string }, string>("toTab"),
};
const secret = "PRIVATE_LOGIN_TOKEN_AND_URL";
let info: ReturnType<typeof vi.spyOn>;

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});
beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal("chrome", { runtime: {} });
	info = vi.spyOn(console, "info").mockImplementation(() => {});
});

function stages() {
	return info.mock.calls.map(([, metadata]) => metadata);
}

describe("extension bridge request logs", () => {
	it("각 방향의 기존 전송 경로와 반환값을 유지하며 호출별 단계를 연결한다", async () => {
		const bridge = createBridge(schema);
		mocks.internal.mockResolvedValue("internal response");
		mocks.external.mockResolvedValue("external response");
		mocks.tab.mockResolvedValue("tab response");

		expect(await bridge.request.OPEN_SIDE_PANEL({ token: "value" })).toBe(
			"internal response",
		);
		expect(await bridge.request.GET_SIDE_PANEL_OPEN()).toBe(
			"external response",
		);
		expect(
			await bridge.request.PAGE_CONTENT({ url: "https://example.com" }),
		).toBe("tab response");
		expect(mocks.internal).toHaveBeenCalledWith("OPEN_SIDE_PANEL", {
			token: "value",
		});
		expect(mocks.external).toHaveBeenCalledWith("GET_SIDE_PANEL_OPEN");
		expect(mocks.tab).toHaveBeenCalledWith("PAGE_CONTENT", {
			url: "https://example.com",
		});
		expect(stages()).toEqual([
			{
				id: 1,
				key: "OPEN_SIDE_PANEL",
				direction: "internal",
				stage: "request",
			},
			{
				id: 1,
				key: "OPEN_SIDE_PANEL",
				direction: "internal",
				stage: "response",
			},
			{
				id: 2,
				key: "GET_SIDE_PANEL_OPEN",
				direction: "toExtension",
				stage: "request",
			},
			{
				id: 2,
				key: "GET_SIDE_PANEL_OPEN",
				direction: "toExtension",
				stage: "response",
			},
			{ id: 3, key: "PAGE_CONTENT", direction: "toTab", stage: "request" },
			{ id: 3, key: "PAGE_CONTENT", direction: "toTab", stage: "response" },
		]);
	});

	it("Chrome 런타임이 없으면 전송하지 않고 skipped를 기록한다", async () => {
		vi.stubGlobal("chrome", undefined);
		const bridge = createBridge(schema);
		expect(
			await bridge.request.OPEN_SIDE_PANEL({ token: secret }),
		).toBeUndefined();
		expect(mocks.internal).not.toHaveBeenCalled();
		expect(stages().map((entry) => entry.stage)).toEqual([
			"request",
			"skipped",
		]);
	});

	it("undefined transport 응답도 완료 단계로만 기록한다", async () => {
		mocks.external.mockResolvedValue(undefined);
		const bridge = createBridge(schema);
		expect(await bridge.request.GET_SIDE_PANEL_OPEN()).toBeUndefined();
		expect(stages().map((entry) => entry.stage)).toEqual([
			"request",
			"response",
		]);
	});

	it("동시 요청이 역순으로 완료돼도 각 호출 ID에 완료 단계를 연결한다", async () => {
		let resolveFirst!: (value: string) => void;
		let resolveSecond!: (value: string) => void;
		const firstTransport = new Promise<string>((resolve) => {
			resolveFirst = resolve;
		});
		const secondTransport = new Promise<string>((resolve) => {
			resolveSecond = resolve;
		});
		mocks.internal
			.mockReturnValueOnce(firstTransport)
			.mockReturnValueOnce(secondTransport);
		const bridge = createBridge(schema);
		const first = bridge.request.OPEN_SIDE_PANEL({ token: "first" });
		const second = bridge.request.OPEN_SIDE_PANEL({ token: "second" });
		resolveSecond("second result");
		expect(await second).toBe("second result");
		resolveFirst("first result");
		expect(await first).toBe("first result");
		expect(
			stages().map((entry) => ({ id: entry.id, stage: entry.stage })),
		).toEqual([
			{ id: 1, stage: "request" },
			{ id: 2, stage: "request" },
			{ id: 2, stage: "response" },
			{ id: 1, stage: "response" },
		]);
	});

	it("handle 등록 경로와 해제 함수를 변경하지 않는다", () => {
		const unsubscribeInternal = vi.fn();
		const unsubscribeExternal = vi.fn();
		mocks.onMessage.mockReturnValue(unsubscribeInternal);
		mocks.onMessageExternal.mockReturnValue(unsubscribeExternal);
		const bridge = createBridge(schema);
		bridge.handle.OPEN_SIDE_PANEL(() => {})();
		bridge.handle.GET_SIDE_PANEL_OPEN(() => {})();
		bridge.handle.PAGE_CONTENT(() => {})();
		expect(mocks.onMessage.mock.calls.map(([type]) => type)).toEqual([
			"OPEN_SIDE_PANEL",
			"PAGE_CONTENT",
		]);
		expect(mocks.onMessageExternal.mock.calls.map(([type]) => type)).toEqual([
			"GET_SIDE_PANEL_OPEN",
		]);
		expect(unsubscribeInternal).toHaveBeenCalledTimes(2);
		expect(unsubscribeExternal).toHaveBeenCalledOnce();
	});

	it("동기 throw를 같은 오류 객체로 재던지고 민감한 오류 내용을 기록하지 않는다", () => {
		const error = new Error(secret);
		mocks.internal.mockImplementation(() => {
			throw error;
		});
		const bridge = createBridge(schema);
		expect(() => bridge.request.OPEN_SIDE_PANEL({ token: secret })).toThrow(
			error,
		);
		expect(stages().map((entry) => entry.stage)).toEqual([
			"request",
			"failure",
		]);
		expect(JSON.stringify(info.mock.calls)).not.toContain(secret);
	});

	it("비동기 reject를 같은 오류 객체로 전달하고 payload·response·오류를 로그에 넣지 않는다", async () => {
		const error = new Error(secret);
		mocks.tab.mockRejectedValue(error);
		const bridge = createBridge(schema);
		await expect(bridge.request.PAGE_CONTENT({ url: secret })).rejects.toBe(
			error,
		);
		expect(stages().map((entry) => entry.stage)).toEqual([
			"request",
			"failure",
		]);
		expect(JSON.stringify(info.mock.calls)).not.toContain(secret);
		mocks.internal.mockResolvedValue(secret);
		await bridge.request.OPEN_SIDE_PANEL({ token: secret });
		expect(JSON.stringify(info.mock.calls)).not.toContain(secret);
	});
});
