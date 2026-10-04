import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useState } from "react";
import { useMemoHighlights } from "../MemoView/_hooks/useMemoHighlights";
import { MemoHighlights } from "../MemoView/MemoHighlights";

export function MemoDialogHighlights({ lng, url }: HighlightsProps) {
	const { t } = useTranslation(lng);
	const [isExpanded, setExpanded] = useState(false);
	const { highlightsByUrl, isHighlightLoadError, refetchHighlights } =
		useMemoHighlights([url]);
	const highlights = highlightsByUrl.get(url) ?? [];

	if (isHighlightLoadError) {
		return (
			<div
				role="alert"
				className="flex items-center gap-2 text-sm text-destructive"
			>
				<p>{t("highlight.loadError")}</p>
				<button
					type="button"
					onClick={() => void refetchHighlights()}
					className="underline"
				>
					{t("error.500.retry")}
				</button>
			</div>
		);
	}
	if (highlights.length === 0) return null;

	return (
		<div>
			<button
				type="button"
				aria-expanded={isExpanded}
				onClick={() => setExpanded((expanded) => !expanded)}
				className="text-xs font-semibold text-muted-foreground"
			>
				{t("memoSection.highlightCount", { count: highlights.length })}
			</button>
			{isExpanded && (
				<MemoHighlights
					highlights={highlights}
					label={t("sideBar.highlight")}
					className="pt-2"
				/>
			)}
		</div>
	);
}

interface HighlightsProps extends LanguageType {
	url: string;
}
