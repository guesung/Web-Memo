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
