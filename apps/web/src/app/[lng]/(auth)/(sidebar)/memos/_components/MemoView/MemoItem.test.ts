import type { GetMemoResponse } from "@web-memo/shared/types";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MemoItem from "./MemoItem";

vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({ t: (key: string) => key }),
}));
vi.mock("@web-memo/shared/modules/search-params", () => ({
	useSearchParams: () => ({}),
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
vi.mock("../MemoCardFooter", () => ({ default: () => null }));
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
