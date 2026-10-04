"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type { HighlightColor } from "@web-memo/shared/constants";
import { useDebounce } from "@web-memo/shared/hooks";
import { groupHighlightsByUrl } from "@web-memo/shared/modules/highlight";
import { Suspense, useEffect, useState } from "react";
import { useHighlightCounts, useHighlightList } from "../_hooks";
import { HighlightEmptyState } from "./HighlightEmptyState";
import { HighlightFilterBar } from "./HighlightFilterBar";
import { HighlightGroupCard } from "./HighlightGroupCard";
import { HighlightListSkeleton } from "./HighlightListSkeleton";

interface HighlightViewProps {
	lng: Language;
}

/** 필터 바와 하이라이트 목록을 묶는다. 클라이언트 준비만 Suspense에 걸린다. */
export function HighlightView({ lng }: HighlightViewProps) {
	const [searchInput, setSearchInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedColor, setSelectedColor] = useState<HighlightColor>();
	const { debounce, abortDebounce } = useDebounce();

	useEffect(() => abortDebounce, [abortDebounce]);

	function handleSearchInputChange(value: string) {
		setSearchInput(value);
		debounce(() => setSearchQuery(value.trim()));
	}

	function handleClearFilters() {
		abortDebounce();
		setSearchInput("");
		setSearchQuery("");
		setSelectedColor(undefined);
	}

	return (
		<div className="flex flex-col gap-4">
			<HighlightFilterBar
				lng={lng}
				searchInput={searchInput}
				selectedColor={selectedColor}
				onSearchInputChange={handleSearchInputChange}
				onColorChange={setSelectedColor}
			/>

			<Suspense fallback={<HighlightListSkeleton />}>
				<HighlightList
					lng={lng}
					searchQuery={searchQuery}
					selectedColor={selectedColor}
					onClearFilters={handleClearFilters}
				/>
			</Suspense>
		</div>
	);
}

interface HighlightListProps {
	lng: Language;
	searchQuery: string;
	selectedColor?: HighlightColor;
	onClearFilters: () => void;
}

/** 하이라이트를 URL별로 묶고 추가 페이지는 사용자 요청에만 불러온다. */
function HighlightList({
	lng,
	searchQuery,
	selectedColor,
	onClearFilters,
}: HighlightListProps) {
	const { t } = useTranslation(lng);
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetching,
		isFetchingNextPage,
		isPending,
		isError,
		isRefetchError,
		isFetchNextPageError,
		refetch,
	} = useHighlightList({
		searchQuery: searchQuery || undefined,
		color: selectedColor,
	});
	const rows = data?.pages.flat() ?? [];
	const groups = groupHighlightsByUrl(rows);
	const counts = useHighlightCounts(groups.map((group) => group.url));
	const isFiltering = searchQuery.length > 0 || selectedColor !== undefined;

	if (isPending) return <HighlightListSkeleton />;

	if (isError && !data) {
		return (
			<HighlightLoadError
				lng={lng}
				isPending={isFetching}
				onRetry={() => {
					if (!isFetching) void refetch({ cancelRefetch: false });
				}}
				centered
			/>
		);
	}

	if (rows.length === 0) {
		return (
			<>
				{isRefetchError && (
					<HighlightLoadError
						lng={lng}
						isPending={isFetching}
						onRetry={() => {
							if (!isFetching) void refetch({ cancelRefetch: false });
						}}
					/>
				)}
				<HighlightEmptyState
					lng={lng}
					isFiltering={isFiltering}
					onClearFilters={onClearFilters}
				/>
			</>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{isRefetchError && (
				<HighlightLoadError
					lng={lng}
					isPending={isFetching}
					onRetry={() => {
						if (!isFetching) void refetch({ cancelRefetch: false });
					}}
				/>
			)}
			{groups.map((group) => (
				<HighlightGroupCard
					key={group.url}
					group={group}
					lng={lng}
					count={counts.get(group.url) ?? 0}
				/>
			))}

			{isFetchNextPageError ? (
				<HighlightLoadError
					lng={lng}
					isPending={isFetching}
					onRetry={() => {
						if (!isFetching && hasNextPage)
							void fetchNextPage({ cancelRefetch: false });
					}}
				/>
			) : hasNextPage ? (
				<button
					type="button"
					onClick={() => {
						if (!isFetching && hasNextPage)
							void fetchNextPage({ cancelRefetch: false });
					}}
					disabled={isFetching}
					className="mx-auto rounded-lg border border-border bg-background px-4 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
				>
					{t(
						isFetchingNextPage ? "highlight.loadingMore" : "highlight.loadMore",
					)}
				</button>
			) : null}
		</div>
	);
}

/** 목록을 보존하면서 재시도할 수 있는 오류 알림. */
function HighlightLoadError({
	lng,
	onRetry,
	centered = false,
	isPending = false,
}: {
	lng: Language;
	onRetry: () => void;
	centered?: boolean;
	isPending?: boolean;
}) {
	const { t } = useTranslation(lng);

	return (
		<div
			role="alert"
			className={`flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive${centered ? " justify-center py-16" : ""}`}
		>
			<span>{t("highlight.loadError")}</span>
			<button
				type="button"
				onClick={onRetry}
				disabled={isPending}
				className="rounded-md border border-border bg-background px-3 py-1.5 font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{t("error.500.retry")}
			</button>
		</div>
	);
}
