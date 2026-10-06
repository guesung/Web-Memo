// @vitest-environment jsdom
import type { GetMemoResponse } from "@web-memo/shared/types";
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MemoItem from "./MemoItem";

vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({ t: (key: string) => key }),
}));
const { setSearchParam } = vi.hoisted(() => ({ setSearchParam: vi.fn() }));
vi.mock("@web-memo/shared/modules/search-params", () => ({
	useSearchParams: () => ({ set: setSearchParam, getUrl: () => "/" }),
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn() },
}));
vi.mock("@web-memo/shared/utils", async () => {
	const { cn } = await import(
		"../../../../../../../../../../packages/shared/src/utils/Tailwind"
	);

	return { cn };
});
vi.mock("../MemoCardHeader", () => ({ default: () => null }));
vi.mock("../MemoCardFooter", () => ({
	default: ({ highlightCount }: { highlightCount?: number }) =>
		highlightCount
			? createElement(
					"span",
					null,
					`memoSection.highlightCount:${highlightCount}`,
				)
			: null,
}));
const CLAMP = vi.hoisted(() => ({ value: false }));
vi.mock("./_hooks/useIsContentClamped", () => ({
	default: () => ({ containerRef: () => {}, isContentClamped: CLAMP.value }),
}));
vi.mock("framer-motion", () => ({
	motion: { div: ({ children }: { children: ReactNode }) => children },
}));
vi.mock("@web-memo/ui", () => ({
	Card: ({ children }: { children: ReactNode }) => children,
	CardContent: ({
		children,
		className,
	}: {
		children: ReactNode;
		className: string;
	}) => createElement("div", { className }, children),
}));

const MEMO = {
	id: 1,
	url: "https://example.com",
	memo: "작성한 본문",
	impression: "느낀 점 내용",
	actionItem: "액션 내용",
} as GetMemoResponse;

const renderMemo = (props: Partial<Parameters<typeof MemoItem>[0]> = {}) =>
	renderToStaticMarkup(
		createElement(MemoItem, {
			lng: "ko",
			memo: MEMO,
			index: 0,
			showImpression: true,
			showActionItem: true,
			...props,
		}),
	);

describe("메모 목록 미리보기", () => {
	it("일반 목록의 본문과 보조 내용을 제한한다", () => {
		const html = renderMemo();
		expect(html).toContain('class="line-clamp-3">작성한 본문');
		expect(html).toContain('class="line-clamp-2">느낀 점 내용');
		expect(html).toContain('class="line-clamp-2">액션 내용');
	});
	it.each([true, false])(
		"말줄임 설정 %s와 무관하게 인용문 대신 개수만 표시한다",
		(truncateMemoContent) => {
			const html = renderMemo({
				truncateMemoContent,
				highlights: [
					{ id: 1, exact_text: "첫 번째 인용문", color: "yellow" },
					{ id: 2, exact_text: "두 번째 인용문", color: "yellow" },
				] as Parameters<typeof MemoItem>[0]["highlights"],
			});

			expect(html).toContain("작성한 본문");
			expect(html).toContain("느낀 점 내용");
			expect(html).toContain("액션 내용");
			expect(html).not.toContain("첫 번째 인용문");
			expect(html).not.toContain("두 번째 인용문");
			expect(html.includes("line-clamp")).toBe(truncateMemoContent);
			expect(html).toContain("memoSection.highlightCount:2");
		},
	);
	it.each([undefined, []])(
		"하이라이트가 없거나 로딩 중이면 개수 영역을 만들지 않는다",
		(highlights) => {
			expect(renderMemo({ highlights })).not.toContain(
				"memoSection.highlightCount",
			);
		},
	);
	it("휴지통에서는 본문과 보조 내용을 제한하지 않고 하이라이트를 숨긴다", () => {
		const html = renderMemo({
			isReadOnly: true,
			highlights: [
				{ id: 1, exact_text: "인용문", color: "yellow" },
			] as Parameters<typeof MemoItem>[0]["highlights"],
		});
		expect(html).not.toContain("line-clamp");
		expect(html).toContain("작성한 본문");
		expect(html).toContain("느낀 점 내용");
		expect(html).toContain("액션 내용");
		expect(html).not.toContain("인용문");
		expect(html).not.toContain('role="button"');
	});
	it("휴지통 커스텀 푸터를 전달하면 기본 푸터와 하이라이트 개수를 렌더링하지 않는다", () => {
		const html = renderMemo({
			isReadOnly: true,
			highlights: [
				{ id: 1, exact_text: "인용문", color: "yellow" },
			] as Parameters<typeof MemoItem>[0]["highlights"],
			footer: createElement("span", null, "trash footer"),
		});
		expect(html).toContain("trash footer");
		expect(html).not.toContain("memoSection.highlightCount");
		expect(html).not.toContain("인용문");
	});
	it("설정이 꺼진 보조 콘텐츠는 영역을 만들지 않는다", () => {
		const html = renderMemo({ showImpression: false, showActionItem: false });
		expect(html).not.toContain("느낀 점 내용");
		expect(html).not.toContain("액션 내용");
		expect(html).not.toContain("memoSection");
	});
	it("공백뿐인 콘텐츠는 영역을 만들지 않는다", () => {
		const html = renderMemo({
			memo: { ...MEMO, memo: "  ", impression: "\n", actionItem: "" },
		});
		expect(html).not.toContain("line-clamp");
		expect(html).not.toContain("memoSection");
	});
});

const TWO_HIGHLIGHTS = [
	{ id: 1, exact_text: "첫 번째 인용문", color: "yellow" },
	{ id: 2, exact_text: "두 번째 인용문", color: "yellow" },
] as Parameters<typeof MemoItem>[0]["highlights"];

const mountMemo = (props: Partial<Parameters<typeof MemoItem>[0]> = {}) => {
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	act(() => {
		root.render(
			createElement(MemoItem, {
				lng: "ko",
				memo: MEMO,
				index: 0,
				showImpression: true,
				showActionItem: true,
				...props,
			}),
		);
	});

	return container;
};

describe("메모 카드 펼치기", () => {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
	globalThis.ResizeObserver ??= class {
		observe() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver;

	it("하이라이트와 관계없이 잘린 메모 내용만 펼치고 다시 접는다", () => {
		CLAMP.value = true;
		const container = mountMemo({ highlights: TWO_HIGHLIGHTS });
		const expandButton = container.querySelector("button");

		expect(expandButton?.textContent).toBe("memoSection.expand");
		expect(container.innerHTML).not.toContain("첫 번째 인용문");

		act(() => expandButton?.click());
		expect(expandButton?.getAttribute("aria-expanded")).toBe("true");
		expect(expandButton?.textContent).toBe("memoSection.collapse");
		expect(container.innerHTML).not.toContain("두 번째 인용문");
		expect(container.innerHTML).not.toContain("line-clamp");

		act(() => expandButton?.click());
		expect(container.innerHTML).not.toContain("두 번째 인용문");
		expect(container.innerHTML).toContain("line-clamp");
		CLAMP.value = false;
	});
	it("메모 펼치기를 눌러도 상세를 열지 않는다", () => {
		CLAMP.value = true;
		setSearchParam.mockClear();
		const container = mountMemo({ highlights: TWO_HIGHLIGHTS });

		act(() => container.querySelector("button")?.click());
		expect(setSearchParam).not.toHaveBeenCalled();
		CLAMP.value = false;
	});
	it("카드를 누르면 기존과 같이 상세 메모 ID를 URL에 쓴다", () => {
		setSearchParam.mockClear();
		const container = mountMemo({ highlights: TWO_HIGHLIGHTS });

		act(() =>
			container
				.querySelector('[role="button"]')
				?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
		);
		expect(setSearchParam).toHaveBeenCalledWith("id", "1");
	});
	it.each([
		["잘린 내용이 없으면", { highlights: TWO_HIGHLIGHTS }],
		[
			"말줄임이 꺼져 있으면",
			{ truncateMemoContent: false, highlights: TWO_HIGHLIGHTS },
		],
		["휴지통이면", { isReadOnly: true, highlights: TWO_HIGHLIGHTS }],
	])("%s 펼치기 버튼을 두지 않는다", (_, props) => {
		const container = mountMemo(props);
		expect(container.querySelector("button")).toBeNull();
	});
});
