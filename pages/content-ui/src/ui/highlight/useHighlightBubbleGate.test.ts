// @vitest-environment jsdom
import { ChromeSyncStorage } from "@web-memo/shared/modules/chrome-storage";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { useHighlightBubbleGate } from "./useHighlightBubbleGate";

vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	ChromeSyncStorage: {
		get: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
	},
	STORAGE_KEYS: {
		highlightBubbleEnabled: "highlightBubbleEnabled",
		highlightIntroSeen: "highlightIntroSeen",
		highlightDisabledSites: "highlightDisabledSites",
		highlightBubblePosition: "highlightBubblePosition",
	},
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		request: {
			GET_LOGIN_STATUS: vi.fn().mockResolvedValue({ isLoggedIn: true }),
		},
	},
}));

afterEach(() => {
	vi.resetAllMocks();
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
});

it("팝업 위치 조회 실패 시 위치 변경을 잠그고 고정 진단 코드를 남긴다", async () => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.mocked(ChromeSyncStorage.get).mockImplementation(async (key) => {
		if (key === "highlightBubblePosition") {
			throw new Error("storage unavailable");
		}

		return undefined;
	});
	const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	let state: ReturnType<typeof useHighlightBubbleGate> | undefined;
	const TestHook = () => {
		state = useHighlightBubbleGate();

		return null;
	};
	await act(async () => {
		root.render(createElement(TestHook));
	});
	expect(state?.positionSettingStatus).toBe("error");
	expect(consoleError).toHaveBeenCalledWith(
		"[DB-1017:highlightBubblePosition:readFailed]",
		expect.any(Error),
	);
	await act(async () => {
		root.unmount();
	});
	consoleError.mockRestore();
});
