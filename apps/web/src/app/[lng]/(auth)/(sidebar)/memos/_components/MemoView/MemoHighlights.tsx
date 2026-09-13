import {
	HIGHLIGHT_COLOR_STYLE,
	type HighlightColor,
} from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";

/** 메모 본문 아래에 원문 하이라이트를 저장된 형광펜 색상으로 표시한다. */
export const MemoHighlights = ({
	highlights = [],
	label,
}: IFMemoHighlightsProps) => {
	if (highlights.length === 0) {
		return null;
	}

	return (
		<section className="px-5 pb-3" aria-label={label}>
			<p className="mb-1 text-xs font-semibold text-muted-foreground">
				{label}
			</p>
			<ul className="space-y-2">
				{highlights.map((highlight) => (
					<li
						key={highlight.id}
						className="text-sm leading-6 whitespace-pre-wrap break-words"
					>
						<mark
							className="box-decoration-clone rounded-sm px-1 text-foreground"
							style={{
								backgroundColor:
									HIGHLIGHT_COLOR_STYLE[highlight.color as HighlightColor]
										.background,
							}}
						>
							{highlight.exact_text}
						</mark>
					</li>
				))}
			</ul>
		</section>
	);
};

/** 메모 카드의 하이라이트 표시 속성. */
interface IFMemoHighlightsProps {
	highlights?: HighlightRow[];
	label: string;
}
