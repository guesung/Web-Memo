"use client";

import { HIGHLIGHT_COLOR_STYLE, type HighlightColor } from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";

interface HighlightQuoteProps {
	highlight: HighlightRow;
}

/** URL별 그룹 카드 안에서 하이라이트 한 문장을 보여준다 */
export function HighlightQuote({ highlight }: HighlightQuoteProps) {
	const style = HIGHLIGHT_COLOR_STYLE[highlight.color as HighlightColor];

	return (
		<li className="flex gap-3 py-2">
			<span
				aria-hidden
				className="w-1 shrink-0 rounded-full"
				style={{ backgroundColor: style.bar }}
			/>
			<div className="min-w-0">
				<p className="text-sm leading-6 text-foreground">{highlight.exact_text}</p>
				{highlight.note ? (
					<p className="mt-1 text-xs text-muted-foreground">{highlight.note}</p>
				) : null}
			</div>
		</li>
	);
}
