import {
	HIGHLIGHT_COLOR_STYLE,
	type HighlightColor,
} from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";

/** 메모 본문 아래에 원문 하이라이트를 저장된 형광펜 색상으로 표시한다. */
export const MemoHighlights = ({
	highlights = [],
	label,
	isPreview = false,
	countLabel,
	className,
}: IFMemoHighlightsProps) => {
	if (highlights.length === 0) {
		return null;
	}

	const visibleHighlights = isPreview ? highlights.slice(0, 1) : highlights;

	return (
		<section
			className={className ?? (isPreview ? "px-4 py-2" : "px-5 pb-3")}
			aria-label={label}
		>
			<p className="mb-1 text-xs font-semibold text-muted-foreground">
				{isPreview ? (countLabel ?? label) : label}
			</p>
			<ul className="space-y-2">
				{visibleHighlights.map((highlight) => (
					<li
						key={highlight.id}
						className={`text-sm leading-6 whitespace-pre-wrap break-words${isPreview ? " line-clamp-2" : ""}`}
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
	/** 표시 제한과 별개로 목록과 상세 화면의 여백을 지정한다. */
	className?: string;
	/** 목록에서는 첫 인용문을 두 줄로 제한한다. */
	isPreview?: boolean;
	/** 목록에 표시할 전체 하이라이트 개수 문구. */
	countLabel?: string;
}
