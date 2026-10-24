"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Highlighter, SearchX } from "lucide-react";

interface HighlightEmptyStateProps {
	lng: Language;
	isFiltering?: boolean;
	onClearFilters?: () => void;
}

/** 저장 항목 없음과 필터 결과 없음을 구별한다. */
export function HighlightEmptyState({
	lng,
	isFiltering = false,
	onClearFilters,
}: HighlightEmptyStateProps) {
	const { t } = useTranslation(lng);

	return (
		<div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 py-16 text-center">
			{isFiltering ? (
				<SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
			) : (
				<Highlighter
					className="size-8 text-muted-foreground"
					aria-hidden="true"
				/>
			)}
			<p className="text-sm font-semibold text-foreground">
				{t(isFiltering ? "highlight.noResult" : "highlight.empty.title")}
			</p>
			<p className="text-xs text-muted-foreground">
				{t(
					isFiltering
						? "highlight.noResultHint"
						: "highlight.empty.description",
				)}
			</p>
			{isFiltering && onClearFilters ? (
				<button
					type="button"
					onClick={onClearFilters}
					className="mt-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{t("highlight.clearFilters")}
				</button>
			) : null}
		</div>
	);
}
