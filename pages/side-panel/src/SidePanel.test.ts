// @vitest-environment jsdom
import { act, createElement, type ReactNode, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SidePanel from "./SidePanel";

const mocks = vi.hoisted(() => ({
	claimReturns: vi.fn(),
	trackEvent: vi.fn(),
	trackSidePanelOpen: vi.fn(),
	trackPageView: vi.fn(),
	reportError: vi.fn(),
	registerHandler: vi.fn(),
}));

vi.mock("@web-memo/shared/hooks", () => ({
	useDidMount: (callback: () => void) => useEffect(callback, []),
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: {
		trackEvent: mocks.trackEvent,
		trackSidePanelOpen: mocks.trackSidePanelOpen,
		trackPageView: mocks.trackPageView,
	},
	AnalyticsUserTracking: () => null,
}));
vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	claimNoticeReturns: mocks.claimReturns,
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: { handle: { GET_SIDE_PANEL_OPEN: mocks.registerHandler } },
}));
vi.mock("@web-memo/ui", () => ({
	ErrorBoundary: ({ children }: { children: ReactNode }) => children,
	Toaster: () => null,
}));
vi.mock("./components", () => ({
	QueryProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./components/PageContentProvider", () => ({
	default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./components/SidePanelContent", () => ({ default: () => null }));
vi.mock("./utils", () => ({ reportSidePanelError: mocks.reportError }));

let root: Root;

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.clearAllMocks();
	mocks.claimReturns.mockResolvedValue([]);
	document.body.innerHTML = '<div id="root"></div>';
	root = createRoot(document.getElementById("root") as HTMLElement);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

it("패널을 열 때 청구한 각 공지의 재방문 이벤트를 보낸다", async () => {
	mocks.claimReturns.mockResolvedValue([
		{ noticeId: 3, daysSinceView: 1 },
		{ noticeId: 5, daysSinceView: 7 },
	]);
	await act(async () => root.render(createElement(SidePanel)));
	expect(mocks.claimReturns).toHaveBeenCalledOnce();
	expect(mocks.trackEvent).toHaveBeenNthCalledWith(1, {
		name: "notice_return",
		params: { notice_id: 3, days_since_view: 1 },
	});
	expect(mocks.trackEvent).toHaveBeenNthCalledWith(2, {
		name: "notice_return",
		params: { notice_id: 5, days_since_view: 7 },
	});
	expect(mocks.trackSidePanelOpen).toHaveBeenCalledOnce();
});

it("저장소에서 재방문 청구에 실패하면 이벤트를 보내지 않고 오류를 보고한다", async () => {
	const error = new Error("storage unavailable");
	mocks.claimReturns.mockRejectedValue(error);
	await act(async () => root.render(createElement(SidePanel)));
	expect(mocks.trackEvent).not.toHaveBeenCalled();
	expect(mocks.reportError).toHaveBeenCalledWith({
		error,
		feature: "notice",
		operation: "claim_return",
		stage: "storage",
		level: "warning",
	});
});
