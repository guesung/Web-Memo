// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	updateSidePanel: vi.fn(),
	addActivatedListener: vi.fn(),
	addUpdatedListener: vi.fn(),
}));

vi.mock("webextension-polyfill", () => ({}));
vi.mock("./editHighlight", () => ({ handleEditHighlight: vi.fn() }));
vi.mock("./createHighlight", () => ({ handleCreateHighlight: vi.fn() }));
vi.mock("./getLoginStatus", () => ({ handleGetLoginStatus: vi.fn() }));
vi.mock("./reportBackgroundError", () => ({ reportBackgroundError: vi.fn() }));
vi.mock("@web-memo/env", () => ({ CONFIG: {} }));
vi.mock("@web-memo/shared/constants", () => ({ EXTERNAL_LINK: {} }));
vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	ChromeSyncStorage: {},
	STORAGE_KEYS: {},
}));
vi.mock("@web-memo/shared/utils", () => ({
	HighlightService: vi.fn(),
	MemoService: vi.fn(),
	normalizeUrl: vi.fn(),
	initSentry: vi.fn(),
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	getSupabaseClient: vi.fn(),
	I18n: {},
	Tab: {},
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({ analytics: {} }));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		request: { UPDATE_SIDE_PANEL: mocks.updateSidePanel },
		handle: {
			OPEN_SIDE_PANEL: vi.fn(),
			GET_EXTENSION_MANIFEST: vi.fn(),
			GET_TABS: vi.fn(),
			CREATE_MEMO: vi.fn(),
			GET_HIGHLIGHTS_BY_URL: vi.fn(),
			GET_LOGIN_STATUS: vi.fn(),
			CREATE_HIGHLIGHT: vi.fn(),
			EDIT_HIGHLIGHT: vi.fn(),
		},
	},
}));

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("background 탭 갱신 비대기 요청", () => {
	it("활성화·이동 알림의 Promise 거부를 소비하고 미처리 거부를 발생시키지 않는다", async () => {
		vi.stubGlobal("chrome", {
			runtime: { onInstalled: { addListener: vi.fn() } },
			tabs: {
				onActivated: { addListener: mocks.addActivatedListener },
				onUpdated: { addListener: mocks.addUpdatedListener },
			},
		});
		await import("./index");
		const handleUnhandledRejection = vi.fn();
		const handleProcessUnhandledRejection = vi.fn();
		window.addEventListener("unhandledrejection", handleUnhandledRejection);
		process.on("unhandledRejection", handleProcessUnhandledRejection);
		mocks.updateSidePanel.mockRejectedValue(new Error("No receiver"));

		try {
			expect(mocks.addActivatedListener).toHaveBeenCalledOnce();
			expect(mocks.addUpdatedListener).toHaveBeenCalledOnce();
			expect(mocks.addActivatedListener.mock.calls[0][0]()).toBeUndefined();
			expect(mocks.addUpdatedListener.mock.calls[0][0]()).toBeUndefined();
			await new Promise((resolve) => setTimeout(resolve, 20));

			expect(mocks.updateSidePanel).toHaveBeenCalledTimes(2);
			expect(handleUnhandledRejection).not.toHaveBeenCalled();
			expect(handleProcessUnhandledRejection).not.toHaveBeenCalled();
		} finally {
			window.removeEventListener("unhandledrejection", handleUnhandledRejection);
			process.off("unhandledRejection", handleProcessUnhandledRejection);
		}
	});
});
