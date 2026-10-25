import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	HIGHLIGHT_COLOR_STYLE,
	type HighlightColor,
	PATHS,
} from "@web-memo/shared/constants";
import type { HighlightMemoLink } from "@web-memo/shared/types";
import { getHighlightSourceUrl } from "@web-memo/shared/utils";

interface MemoSourceQuoteProps extends LanguageType {
	source: HighlightMemoLink;
	isPreview?: boolean;
}

/** 메모에 직접 연결된 저장 당시 인용문이다. URL로 찾은 관련 기록과 구별한다. */
export function MemoSourceQuote({
	lng,
	source,
	isPreview = false,
}: MemoSourceQuoteProps) {
	const { t } = useTranslation(lng);
	const isYellow = source.color === "yellow";
	const color = HIGHLIGHT_COLOR_STYLE[source.color as HighlightColor];

	return (
		<section
			className={isPreview ? "px-4 py-2" : "space-y-2"}
			aria-label={t("highlight.memo.quote")}
		>
			<p className="mb-1 text-xs font-semibold text-muted-foreground">
				{t("highlight.memo.quote")}
			</p>
			<blockquote
				className={`rounded-sm border-l-2 px-2 py-1 text-sm leading-6 whitespace-pre-wrap break-words${isPreview ? " line-clamp-3" : ""} ${isYellow ? "bg-highlight-yellow text-highlight-yellow-foreground" : "text-foreground"}`}
				style={{
					borderLeftColor: color?.bar,
					backgroundColor: isYellow ? undefined : color?.background,
				}}
			>
				{source.exact_text}
			</blockquote>
			{!isPreview && (
				<div className="flex flex-wrap gap-3 text-xs">
					{source.highlight_id ? (
						<a
							href={`/${lng}${PATHS.highlights}?highlightId=${source.highlight_id}`}
							className="text-primary underline"
						>
							{t("highlight.memo.viewHighlight")}
						</a>
					) : (
						<span className="text-muted-foreground">
							{t("highlight.memo.deletedHighlight")}
						</span>
					)}
					<a
						href={getHighlightSourceUrl(source)}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary underline"
					>
						{t("highlight.memo.source")}
					</a>
				</div>
			)}
		</section>
	);
}
