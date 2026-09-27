// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import OpenSidePanelButton from "./OpenSidePanelButton";

const mocks = vi.hoisted(() => ({ openSidePanel: vi.fn() }));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn() },
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: { request: { OPEN_SIDE_PANEL: mocks.openSidePanel } },
}));

afterEach(() => {
	document.body.innerHTML = "";
	vi.unstubAllGlobals();
});

describe("패널 열기 비대기 요청", () => {
	it("클릭 요청의 Promise 거부를 소비하고 호스트 페이지에 미처리 거부를 전파하지 않는다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		mocks.openSidePanel.mockRejectedValue(new Error("Bridge timeout"));
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		const handleUnhandledRejection = vi.fn();
		const handleProcessUnhandledRejection = vi.fn();
		window.addEventListener("unhandledrejection", handleUnhandledRejection);
		process.on("unhandledRejection", handleProcessUnhandledRejection);

		try {
			await act(async () => {
				root.render(createElement(OpenSidePanelButton));
			});
			const button = container.querySelector("button");
			expect(button).not.toBeNull();
			await act(async () => {
				button?.click();
				await new Promise((resolve) => setTimeout(resolve, 20));
			});

			expect(mocks.openSidePanel).toHaveBeenCalledOnce();
			expect(handleUnhandledRejection).not.toHaveBeenCalled();
			expect(handleProcessUnhandledRejection).not.toHaveBeenCalled();
		} finally {
			await act(async () => root.unmount());
			window.removeEventListener(
				"unhandledrejection",
				handleUnhandledRejection,
			);
			process.off("unhandledRejection", handleProcessUnhandledRejection);
		}
	});
});
