import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerExtensionSettingsHandlers } from "./extensionSettings";

const mocks = vi.hoisted(() => ({
	handlers: {} as Record<string, (...args: unknown[]) => unknown>,
	get: vi.fn(),
	set: vi.fn(),
	notify: vi.fn(),
}));

vi.mock("@web-memo/env", () => ({ CONFIG: { webUrl: "https://webmemo.test" } }));
vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	ChromeSyncStorage: { get: mocks.get, set: mocks.set },
	STORAGE_KEYS: {
		language: "language",
		autoApplyCategory: "autoApplyCategory",
		highlightBubbleEnabled: "highlightBubbleEnabled",
		highlightBubblePosition: "highlightBubblePosition",
		highlightDisabledSites: "highlightDisabledSites",
	},
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		handle: {
			GET_EXTENSION_SETTINGS: (callback: (...args: unknown[]) => unknown) => {
				mocks.handlers.get = callback;
			},
			SET_EXTENSION_SETTING: (callback: (...args: unknown[]) => unknown) => {
				mocks.handlers.set = callback;
			},
			NOTIFY_SETTING_UPDATED: (callback: (...args: unknown[]) => unknown) => {
				mocks.handlers.notify = callback;
			},
		},
		request: { SETTING_UPDATED: mocks.notify },
	},
}));

beforeEach(() => {
	mocks.get.mockReset();
	mocks.set.mockReset().mockResolvedValue(undefined);
	mocks.notify.mockReset().mockResolvedValue(undefined);
	registerExtensionSettingsHandlers();
});

describe("외부 설정 메시지", () => {
	it("허용된 출처에는 다섯 설정만 기본값과 함께 응답한다", async () => {
		mocks.get.mockResolvedValue(undefined);
		const sendResponse = vi.fn();

		await mocks.handlers.get(undefined, { url: "https://webmemo.test/ko/settings" }, sendResponse);

		expect(sendResponse).toHaveBeenCalledWith({
			success: true,
			protocolVersion: 1,
			settings: {
				language: "ko",
				autoApplyCategory: true,
				highlightBubbleEnabled: true,
				highlightBubblePosition: "below",
				highlightDisabledSites: [],
			},
		});
		expect(mocks.get).toHaveBeenCalledTimes(5);
	});

	it("다른 출처의 조회와 저장을 거부한다", async () => {
		const sendResponse = vi.fn();

		await mocks.handlers.get(undefined, { url: "https://other.test/ko/settings" }, sendResponse);
		await mocks.handlers.set({ key: "language", value: "ko" }, { url: "https://other.test" }, sendResponse);

		expect(sendResponse).toHaveBeenCalledTimes(2);
		expect(sendResponse).toHaveBeenCalledWith({ success: false, error: "forbidden" });
		expect(mocks.get).not.toHaveBeenCalled();
		expect(mocks.set).not.toHaveBeenCalled();
	});

	it("허용 목록 밖 키와 잘못된 값을 저장하지 않는다", async () => {
		const sendResponse = vi.fn();
		const sender = { url: "https://webmemo.test/ko/settings" };

		await mocks.handlers.set({ key: "accessToken", value: "secret" }, sender, sendResponse);
		await mocks.handlers.set({ key: "highlightBubblePosition", value: "left" }, sender, sendResponse);

		expect(sendResponse).toHaveBeenCalledWith({ success: false, error: "invalid_setting" });
		expect(mocks.set).not.toHaveBeenCalled();
	});

	it("저장이 끝난 뒤에만 성공을 응답하고 실패는 별도 결과를 반환한다", async () => {
		let completeSave: (() => void) | undefined;
		mocks.set.mockImplementationOnce(() => new Promise<void>((resolve) => {
			completeSave = resolve;
		}));
		const sendResponse = vi.fn();
		const sender = { url: "https://webmemo.test/ko/settings" };

		const pending = mocks.handlers.set({ key: "autoApplyCategory", value: false }, sender, sendResponse);
		expect(sendResponse).not.toHaveBeenCalled();
		completeSave?.();
		await pending;
		expect(sendResponse).toHaveBeenCalledWith({ success: true, key: "autoApplyCategory", value: false });

		mocks.set.mockRejectedValueOnce(new Error("storage failed"));
		await mocks.handlers.set({ key: "autoApplyCategory", value: true }, sender, sendResponse);
		expect(sendResponse).toHaveBeenCalledWith({ success: false, error: "storage_write_failed" });
	});
});
