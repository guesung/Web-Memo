// @vitest-environment jsdom

import type { HighlightGroup } from "@web-memo/shared/modules/highlight";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HighlightGroupCard } from "./HighlightGroupCard";

const mocks = vi.hoisted(() => ({ openPanel: vi.fn(), trackEvent: vi.fn() }));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.trackEvent },
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: { request: { OPEN_SIDE_PANEL_FROM_WEB: mocks.openPanel } },
}));
vi.mock("@web-memo/shared/utils", () => ({
	getHighlightSourceUrl: ({ url }: { url: string }) => {
		try {
			const parsed = new URL(url);
			return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "#";
		} catch {
			return "#";
		}
	},
}));
vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({ t: (key: string) => key }),
}));
vi.mock("./HighlightQuote", () => ({
	HighlightQuote: () => createElement("li", null, "quote"),
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	container = document.createElement("div");
	document.body.append(container);
	root = createRoot(container);
	mocks.openPanel.mockReset();
	mocks.trackEvent.mockReset();
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
	vi.unstubAllGlobals();
});

const renderCard = async (url = "https://example.com/article") => {
	await act(async () =>
		root.render(
			createElement(HighlightGroupCard, {
				group: {
					url,
					title: "Article",
					favIconUrl: null,
					highlights: [],
				} as HighlightGroup,
				lng: "ko",
				count: 1,
			}),
		),
	);
};

describe("하이라이트 URL 목록 원문 링크", () => {
	it("일반 클릭은 기본 새 탭 링크를 보존하며 패널 요청을 즉시 보낸다", async () => {
		let resolve!: (response: { success: boolean }) => void;
		mocks.openPanel.mockReturnValue(
			new Promise((done) => {
				resolve = done;
			}),
		);
		await renderCard();
		const anchor = container.querySelector("article a");
		expect(anchor?.getAttribute("href")).toBe("https://example.com/article");
		expect(anchor?.getAttribute("target")).toBe("_blank");
		expect(anchor?.getAttribute("aria-label")).toBe(
			"highlight.openSourceAndPanel",
		);
		expect(anchor?.getAttribute("title")).toBe("highlight.openSourceAndPanel");
		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		await act(async () => {
			anchor?.dispatchEvent(click);
		});
		expect(click.defaultPrevented).toBe(false);
		expect(mocks.openPanel).toHaveBeenCalledTimes(1);
		expect(mocks.trackEvent).not.toHaveBeenCalled();
		await act(async () => resolve({ success: true }));
		expect(mocks.trackEvent.mock.calls).toEqual([
			[
				{
					name: "highlight_panel_open_result",
					params: { is_success: true },
				},
			],
		]);
		expect(container.querySelector('[role="alert"]')).toBeNull();
	});

	it.each([undefined, { success: false }])(
		"확장 응답 %s이면 안내를 표시한다",
		async (response) => {
			mocks.openPanel.mockResolvedValue(response);
			await renderCard();
			await act(async () => {
				container
					.querySelector("article a")
					?.dispatchEvent(
						new MouseEvent("click", { bubbles: true, cancelable: true }),
					);
			});
			expect(container.querySelector('[role="alert"]')?.textContent).toBe(
				"highlight.panelOpenError",
			);
			expect(mocks.trackEvent.mock.calls).toEqual([
				[
					{
						name: "highlight_panel_open_result",
						params: { is_success: false },
					},
				],
			]);
		},
	);

	it("브리지 요청이 실패해도 링크의 기본 동작은 보존한다", async () => {
		mocks.openPanel.mockRejectedValue(new Error("extension unavailable"));
		await renderCard();
		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		await act(async () => {
			container.querySelector("article a")?.dispatchEvent(click);
		});
		expect(click.defaultPrevented).toBe(false);
		expect(container.querySelector('[role="alert"]')?.textContent).toBe(
			"highlight.panelOpenError",
		);
		expect(mocks.trackEvent.mock.calls).toEqual([
			[
				{
					name: "highlight_panel_open_result",
					params: { is_success: false },
				},
			],
		]);
	});

	it("수정 클릭은 브라우저 링크 동작만 수행한다", async () => {
		await renderCard();
		const click = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
		});
		await act(async () => {
			container.querySelector("article a")?.dispatchEvent(click);
		});
		expect(click.defaultPrevented).toBe(false);
		expect(mocks.openPanel).not.toHaveBeenCalled();
		expect(mocks.trackEvent).not.toHaveBeenCalled();
	});

	it("HTTP 외 URL은 링크나 패널 동작을 만들지 않는다", async () => {
		await renderCard("javascript:alert(1)");
		expect(container.querySelector("article a")).toBeNull();
		expect(mocks.openPanel).not.toHaveBeenCalled();
		expect(mocks.trackEvent).not.toHaveBeenCalled();
	});
});
