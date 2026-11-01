import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleOpenSidePanelFromWeb } from "./openSidePanelFromWeb";

const mocks = vi.hoisted(() => ({
	open: vi.fn(),
}));

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://www.webmemo.xyz" },
}));

const sender = {
	url: "https://www.webmemo.xyz/ko/highlights",
	origin: "https://www.webmemo.xyz",
	tab: { windowId: 42 },
} as chrome.runtime.MessageSender;

beforeEach(() => {
	vi.resetAllMocks();
	vi.stubGlobal("chrome", { sidePanel: { open: mocks.open } });
});

afterEach(() => vi.unstubAllGlobals());

describe("웹에서 사이드 패널 열기", () => {
	it("발신 창의 패널을 메시지 콜백 안에서 즉시 열고 완료 후 응답한다", async () => {
		let resolveOpen!: () => void;
		mocks.open.mockReturnValue(
			new Promise<void>((resolve) => {
				resolveOpen = resolve;
			}),
		);
		const sendResponse = vi.fn();

		expect(handleOpenSidePanelFromWeb(undefined, sender, sendResponse)).toBe(true);
		expect(mocks.open).toHaveBeenCalledTimes(1);
		expect(mocks.open).toHaveBeenCalledWith({ windowId: 42 });
		expect(sendResponse).not.toHaveBeenCalled();

		resolveOpen();
		await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ success: true }));
	});

	it.each([
		{ url: "https://webmemo.xyz/ko/highlights" },
		{ url: "https://www.webmemo.xyz.evil.test/ko/highlights" },
		{ url: "http://www.webmemo.xyz/ko/highlights" },
		{ url: "not a URL" },
		{ url: undefined },
		{ origin: "https://evil.test" },
		{ tab: undefined },
		{ tab: { windowId: -1 } },
		{ tab: { windowId: 1.5 } },
	])("잘못된 발신 정보는 패널을 열지 않는다: %j", (invalidSender) => {
		const sendResponse = vi.fn();

		expect(
			handleOpenSidePanelFromWeb(
				undefined,
				{ ...sender, ...invalidSender } as chrome.runtime.MessageSender,
				sendResponse,
			),
		).toBe(false);
		expect(mocks.open).not.toHaveBeenCalled();
		expect(sendResponse).toHaveBeenCalledTimes(1);
		expect(sendResponse).toHaveBeenCalledWith({ success: false });
	});

	it("패널 열기 거부를 실패 응답으로 돌린다", async () => {
		mocks.open.mockRejectedValue(new Error("cannot open"));
		const sendResponse = vi.fn();

		expect(handleOpenSidePanelFromWeb(undefined, sender, sendResponse)).toBe(true);
		await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ success: false }));
	});

	it("패널 API가 동기적으로 던져도 실패 응답으로 돌린다", () => {
		mocks.open.mockImplementation(() => {
			throw new Error("cannot open");
		});
		const sendResponse = vi.fn();

		expect(handleOpenSidePanelFromWeb(undefined, sender, sendResponse)).toBe(false);
		expect(sendResponse).toHaveBeenCalledTimes(1);
		expect(sendResponse).toHaveBeenCalledWith({ success: false });
	});
});
