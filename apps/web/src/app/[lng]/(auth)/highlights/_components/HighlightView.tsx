"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useHighlightCounts, useHighlightList } from "../_hooks";
import { groupHighlightsByUrl } from "../_utils";
import { HighlightEmptyState } from "./HighlightEmptyState";
import { HighlightGroupCard } from "./HighlightGroupCard";

interface HighlightViewProps {
	lng: Language;
}

/** 하이라이트를 URL별로 묶어 무한스크롤로 보여준다 */
export function HighlightView({ lng }: HighlightViewProps) {
	const { t } = useTranslation(lng);
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useHighlightList({});
	const rows = data.pages.flat();
	const groups = groupHighlightsByUrl(rows);
	const counts = useHighlightCounts(groups.map((group) => group.url));

	if (rows.length === 0) {
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
