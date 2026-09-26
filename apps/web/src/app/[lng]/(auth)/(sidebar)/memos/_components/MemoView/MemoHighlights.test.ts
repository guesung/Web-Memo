import {
	HIGHLIGHT_COLOR_STYLE,
	HIGHLIGHT_COLORS,
} from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoHighlights } from "./MemoHighlights";

describe("메모 카드 하이라이트", () => {
	it("하이라이트가 없으면 영역을 추가하지 않는다", () => {
		expect(
			renderToStaticMarkup(
				createElement(MemoHighlights, { label: "하이라이트" }),
			),
		).toBe("");
	});
	it.each(HIGHLIGHT_COLORS)(
		"저장된 %s 색상으로 문장 전체를 표시한다",
		(color) => {
			const html = renderToStaticMarkup(
				createElement(MemoHighlights, {
					label: "하이라이트",
					highlights: [
						{ id: 1, exact_text: "원문 <문장>", color } as HighlightRow,
					],
				}),
			);
			expect(html).toContain('aria-label="하이라이트"');
			expect(html).toContain("<mark");
			expect(html).toContain(HIGHLIGHT_COLOR_STYLE[color].background);
			expect(html).toContain("원문 &lt;문장&gt;");
		},
	);
});

describe("하이라이트 목록 미리보기", () => {
	const highlights = [
		{ id: 1, exact_text: "첫 번째 인용문", color: "yellow" } as HighlightRow,
		{ id: 2, exact_text: "두 번째 인용문", color: "blue" } as HighlightRow,
	];
	it("첫 인용문만 제한하고 전체 개수를 표시한다", () => {
		const html = renderToStaticMarkup(
			createElement(MemoHighlights, {
				highlights,
				label: "하이라이트",
				isPreview: true,
				countLabel: "하이라이트 2개",
			}),
		);
		expect(html).toContain("첫 번째 인용문");
		expect(html).not.toContain("두 번째 인용문");
		expect(html).toContain("하이라이트 2개");
		expect(html).toContain("line-clamp-2");
	});
	it("상세에서는 모든 인용문을 제한 없이 표시한다", () => {
		const html = renderToStaticMarkup(
			createElement(MemoHighlights, { highlights, label: "하이라이트" }),
		);
		expect(html).toContain("첫 번째 인용문");
		expect(html).toContain("두 번째 인용문");
		expect(html).not.toContain("line-clamp");
	});
});
