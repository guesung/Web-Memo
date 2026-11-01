// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SidePanelContent from "./SidePanelContent";

const mocks = vi.hoisted(() => ({
	showSummary: true,
	showAiChat: true,
	pageKey: "page-1",
	content: "",
	isLoading: true,
	isAuthPending: true,
	isAuthenticated: false,
	hasRequestedSummary: false,
	generateSummary: vi.fn(),
	trackEvent: vi.fn(),
}));

vi.mock("@src/components", () => ({
	Header: () => null,
	MemoSection: () => createElement("textarea", { id: "memo-textarea" }),
	ResizeHandle: () => null,
	TabSection: () => createElement("div", { id: "summary-area" }),
}));
vi.mock("@src/hooks", () => ({
	useResizablePanel: () => ({
		tabHeight: 50,
		memoHeight: 50,
		isResizing: false,
		handleMouseDown: vi.fn(),
		containerRef: { current: null },
	}),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useAiFeatureSettingsQuery: () => ({
		showSummary: mocks.showSummary,
		showAiChat: mocks.showAiChat,
	}),
	useDidMount: () => {},
	useTabQuery: () => ({ refetch: vi.fn() }),
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.trackEvent },
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({ bridge: {} }));
vi.mock("./PageContentProvider", () => ({
	usePageContentContext: () => ({
		pageKey: mocks.pageKey,
		content: mocks.content,
		isLoading: mocks.isLoading,
		error: null,
	}),
}));
vi.mock("./SummaryDisclosure", () => ({
	SUMMARY_PANEL_ID: "side-panel-summary",
	default: (props: { isOpen: boolean; onToggle: () => void }) =>
		createElement(
			"button",
			{ type: "button", onClick: props.onToggle },
			props.isOpen ? "Hide summary" : "View summary",
		),
}));
vi.mock("./TabSection/components/Summary/components", () => ({
	SummaryProvider: (props: { children: ReactNode }) => props.children,
}));
vi.mock("./TabSection/components/Summary/components/SummaryProvider", () => ({
	useSummaryContext: () => ({
		generateSummary: mocks.generateSummary,
		hasRequestedSummary: mocks.hasRequestedSummary,
		isAuthenticated: mocks.isAuthenticated,
		isAuthPending: mocks.isAuthPending,
	}),
}));

let root: Root;
const render = async () => {
	await act(async () => root.render(createElement(SidePanelContent)));
};

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => ({ matches: false })),
	);
	vi.clearAllMocks();
	Object.assign(mocks, {
		showSummary: true,
		showAiChat: true,
		pageKey: "page-1",
		content: "",
		isLoading: true,
		isAuthPending: true,
		isAuthenticated: false,
		hasRequestedSummary: false,
	});
	document.body.innerHTML = '<div id="root"></div>';
	root = createRoot(document.getElementById("root") as HTMLElement);
});
afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

describe("summary setting gate", () => {
	it("cancels a pending open when switched off before content and auth are ready", async () => {
		await render();
		await act(async () =>
			Array.from(document.querySelectorAll("button"))
				.find((button) => button.textContent === "View summary")
				?.click(),
		);
		expect(document.body.textContent).toContain("Hide summary");
		expect(mocks.generateSummary).not.toHaveBeenCalled();
		const memo = document.getElementById(
			"memo-textarea",
		) as HTMLTextAreaElement;
		memo.value = "Keep this draft";
		memo.focus();
		memo.setSelectionRange(4, 4);

		mocks.showSummary = false;
		await render();
		expect(document.body.textContent).not.toContain("summary");
		expect(memo.value).toBe("Keep this draft");
		expect(memo.selectionStart).toBe(4);
		expect(document.activeElement).toBe(memo);
		mocks.content = "Ready page content";
		mocks.isLoading = false;
		mocks.isAuthPending = false;
		mocks.isAuthenticated = true;
		await render();
		expect(mocks.generateSummary).not.toHaveBeenCalled();
		expect(document.getElementById("memo-textarea")).toBe(memo);
		expect(mocks.trackEvent).toHaveBeenCalledTimes(1);

		mocks.showSummary = true;
		await render();
		expect(document.body.textContent).toContain("View summary");
		expect(mocks.generateSummary).not.toHaveBeenCalled();
	});
});
