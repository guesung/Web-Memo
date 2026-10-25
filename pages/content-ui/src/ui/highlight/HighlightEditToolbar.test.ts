// @vitest-environment jsdom
import { analytics } from "@web-memo/shared/modules/analytics";
import type { HighlightRow } from "@web-memo/shared/types";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HighlightEditToolbar } from "./HighlightEditToolbar";

const requests = vi.hoisted(() => ({
	links: vi.fn(),
	openPanel: vi.fn(),
	createMemo: vi.fn(),
}));
vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://www.webmemo.xyz" },
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		request: {
			GET_HIGHLIGHT_MEMO_LINKS: requests.links,
			OPEN_SIDE_PANEL: requests.openPanel,
			CREATE_MEMO_FROM_HIGHLIGHT: requests.createMemo,
		},
	},
}));
vi.mock("../../utils/reportError", () => ({ reportContentUiError: vi.fn() }));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn() },
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key },
}));

const makeState = (id: number) => ({
	row: {
		id,
		color: "yellow",
		note: "same note",
		exact_text: "quoted text",
	} as HighlightRow,
	x: 10,
	y: 10,
	isSaving: false,
	message: "",
});

const renderToolbar = async (id = 1) => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	await act(async () => {
		root.render(
			createElement(HighlightEditToolbar, {
				state: makeState(id),
				onHighlightEdit: vi.fn(),
			}),
		);
	});
	return { container, root };
};

afterEach(() => {
	requests.links.mockReset();
	requests.openPanel.mockReset();
	requests.createMemo.mockReset();
	vi.clearAllMocks();
	document.body.innerHTML = "";
	vi.unstubAllGlobals();
});

describe("하이라이트 메모 동작", () => {
	it("연결 조회 실패 시 재조회 후 패널을 연다. 새 메모는 생성하지 않는다", async () => {
		requests.links
			.mockResolvedValueOnce({ success: false, reason: "load_failed" })
			.mockResolvedValueOnce({ success: true, links: [] });
		requests.openPanel.mockResolvedValue({ success: true });
		const { container, root } = await renderToolbar();
		expect(container.textContent).toContain("highlight_memo_load_failed");
		await act(async () => {
			container.querySelector<HTMLButtonElement>("button.underline")?.click();
		});
		expect(container.textContent).toContain("highlight_panel_memo_action");
		await act(async () => {
			[...container.querySelectorAll("button")]
				.find((button) =>
					button.textContent?.includes("highlight_panel_memo_action"),
				)
				?.click();
		});
		expect(requests.openPanel).toHaveBeenCalledTimes(1);
		expect(requests.createMemo).not.toHaveBeenCalled();
		expect(container.querySelector("textarea")).toBeNull();
		await act(async () => root.unmount());
	});

	it("패널을 열지 못하면 재시도할 수 있도록 오류를 표시한다", async () => {
		requests.links.mockResolvedValue({ success: true, links: [] });
		requests.openPanel.mockResolvedValueOnce({ success: false });
		const { container, root } = await renderToolbar();
		await act(async () => {
			[...container.querySelectorAll("button")]
				.find((button) =>
					button.textContent?.includes("highlight_panel_memo_action"),
				)
				?.click();
		});
		expect(container.textContent).toContain("highlight_panel_open_failed");
		await act(async () => root.unmount());
	});

	it("연결된 메모는 기존 경로로 열고 이벤트를 기록한다", async () => {
		requests.links.mockResolvedValue({
			success: true,
			links: [
				{
					highlight_id: 1,
					memo_id: 42,
					memo: { id: 42, memo: "saved", deleted_at: null },
				},
			],
		});
		const { container, root } = await renderToolbar();
		const link = container.querySelector<HTMLAnchorElement>("a");
		expect(link?.href).toBe("https://www.webmemo.xyz/memos?id=42");
		expect(link?.textContent).toBe("highlight_memo_open");
		await act(async () => link?.click());
		expect(analytics.trackEvent).toHaveBeenCalledWith({
			name: "memo_open",
			params: { source: "highlight", has_search_query: false },
		});
		expect(requests.openPanel).not.toHaveBeenCalled();
		await act(async () => root.unmount());
	});

	it("휴지통에 연결된 메모는 복원 경로를 연다", async () => {
		requests.links.mockResolvedValue({
			success: true,
			links: [
				{
					highlight_id: 1,
					memo_id: 42,
					memo: { id: 42, memo: "saved", deleted_at: "2026-10-11T00:00:00Z" },
				},
			],
		});
		const { container, root } = await renderToolbar();
		const link = container.querySelector<HTMLAnchorElement>("a");
		expect(link?.href).toBe("https://www.webmemo.xyz/memos/trash?id=42");
		expect(link?.textContent).toBe("highlight_memo_restore");
		expect(requests.openPanel).not.toHaveBeenCalled();
		await act(async () => root.unmount());
	});
});
