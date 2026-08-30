"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type { HighlightColor } from "@web-memo/shared/constants";
import { groupHighlightsByUrl } from "@web-memo/shared/modules/highlight";
import { Suspense, useState } from "react";
import { useHighlightCounts, useHighlightList } from "../_hooks";
import { HighlightEmptyState } from "./HighlightEmptyState";
import { HighlightFilterBar } from "./HighlightFilterBar";
import { HighlightGroupCard } from "./HighlightGroupCard";
import { HighlightListSkeleton } from "./HighlightListSkeleton";

interface HighlightViewProps {
	lng: Language;
}

/** 필터 바와 하이라이트 목록을 묶는다. 필터가 바뀌면 목록만 다시 Suspense에 걸린다 */
export function HighlightView({ lng }: HighlightViewProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedColor, setSelectedColor] = useState<HighlightColor>();

	return (
		<div className="flex flex-col gap-4">
			<HighlightFilterBar
				lng={lng}
				selectedColor={selectedColor}
				onSearchQueryChange={setSearchQuery}
				onColorChange={setSelectedColor}
			/>

			<Suspense fallback={<HighlightListSkeleton />}>
				<HighlightList
					lng={lng}
					searchQuery={searchQuery}
					selectedColor={selectedColor}
				/>
			</Suspense>
		</div>
	);
}

interface HighlightListProps {
	lng: Language;
	searchQuery: string;
	selectedColor?: HighlightColor;
}

/** 하이라이트를 URL별로 묶어 무한스크롤로 보여준다 */
function HighlightList({
	lng,
	searchQuery,
	selectedColor,
}: HighlightListProps) {
	const { t } = useTranslation(lng);
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useHighlightList({
			searchQuery: searchQuery || undefined,
			color: selectedColor,
		});
	const rows = data.pages.flat();
	const groups = groupHighlightsByUrl(rows);
	const counts = useHighlightCounts(groups.map((group) => group.url));
	const isFiltering = searchQuery.length > 0 || selectedColor !== undefined;

	if (rows.length === 0) {
		if (isFiltering) {
			return (
				<p className="py-16 text-center text-sm text-muted-foreground">
					{t("highlight.noResult")}
				</p>
			);
		}

		return <HighlightEmptyState lng={lng} />;
	}

	return (
		<div className="flex flex-col gap-4">
			{groups.map((group) => (
				<HighlightGroupCard
					key={group.url}
					group={group}
					lng={lng}
					count={counts.get(group.url) ?? 0}
				/>
			))}

			{hasNextPage ? (
				<button
					type="button"
					onClick={() => fetchNextPage()}
					disabled={isFetchingNextPage}
					className="mx-auto rounded-lg border border-border px-4 py-2 text-sm"
				>
					{t("highlight.loadMore")}
				</button>
			) : null}
		</div>
	);
}
