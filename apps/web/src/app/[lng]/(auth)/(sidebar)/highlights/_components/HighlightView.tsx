"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useQuery } from "@tanstack/react-query";
import type { HighlightColor } from "@web-memo/shared/constants";
import {
	useDebounce,
	useHighlightMemoLinks,
	useSupabaseClientQuery,
	useSupabaseUserQuery,
} from "@web-memo/shared/hooks";
import { groupHighlightsByUrl } from "@web-memo/shared/modules/highlight";
import { HighlightService } from "@web-memo/shared/utils";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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
		<div className="mx-auto flex w-full max-w-[840px] flex-col gap-8">
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

/** 하이라이트를 URL별로 묶고 스크롤 끝에서 다음 페이지를 불러온다. */
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
	const searchParams = useSearchParams();
	const requestedId = Number(searchParams.get("highlightId"));
	const targetHighlightId =
		Number.isSafeInteger(requestedId) && requestedId > 0
			? requestedId
			: undefined;
	const { data: client } = useSupabaseClientQuery();
	const { user } = useSupabaseUserQuery();
	const userId = user.data.user?.id;
	const target = useQuery({
		queryKey: ["highlights", "target", userId, targetHighlightId],
		enabled: !!targetHighlightId && !!userId,
		queryFn: async () => {
			if (!targetHighlightId || !userId)
				throw new Error("Missing highlight identity");
			const { data, error } = await new HighlightService(
				client,
			).getHighlightById({ id: targetHighlightId, userId });
			if (error) throw error;
			return data;
		},
	});
	const targetRow = target.data;
	const separateTarget =
		targetRow && !rows.some((row) => row.id === targetRow.id)
			? targetRow
			: undefined;
	const visibleGroups = groupHighlightsByUrl(
		separateTarget ? [separateTarget, ...rows] : rows,
	);
	const counts = useHighlightCounts(visibleGroups.map((group) => group.url));
	const links = useHighlightMemoLinks([
		...rows.map((row) => row.id),
		...(separateTarget ? [separateTarget.id] : []),
	]);
	const linksByHighlight = new Map(
		(links.data ?? []).flatMap((link) =>
			link.highlight_id === null ? [] : [[link.highlight_id, link] as const],
		),
	);
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

	if (rows.length === 0 && !separateTarget) {
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
		<div className="flex flex-col gap-8">
			{target.isError && (
				<HighlightLoadError lng={lng} onRetry={() => void target.refetch()} />
			)}
			{isRefetchError && (
				<HighlightLoadError
					lng={lng}
					isPending={isFetching}
					onRetry={() => {
						if (!isFetching) void refetch({ cancelRefetch: false });
					}}
				/>
			)}
			<HighlightListPagination
				key={`${searchQuery}:${selectedColor ?? ""}`}
				pageCount={data?.pages.length ?? 0}
				hasNextPage={!!hasNextPage}
				isFetching={isFetching}
				isFetchNextPageError={isFetchNextPageError}
				fetchNextPage={() => void fetchNextPage({ cancelRefetch: false })}
			>
				{visibleGroups.map((group) => (
					<div key={group.url}>
						<HighlightGroupCard
							group={group}
							lng={lng}
							count={counts.get(group.url) ?? 0}
							links={linksByHighlight}
							isLinkLoading={links.isPending}
							isLinkError={links.isError}
							onRetryLinks={() => void links.refetch()}
							targetHighlightId={targetHighlightId}
						/>
					</div>
				))}
			</HighlightListPagination>

			{isFetchNextPageError ? (
				<HighlightLoadError
					lng={lng}
					isPending={isFetching}
					onRetry={() => {
						if (!isFetching && hasNextPage)
							void fetchNextPage({ cancelRefetch: false });
					}}
				/>
			) : isFetchingNextPage ? (
				<output className="block text-center text-sm text-muted-foreground">
					{t("highlight.loadingMore")}
				</output>
			) : null}
		</div>
	);
}

function HighlightListPagination({
	children,
	pageCount,
	hasNextPage,
	isFetching,
	isFetchNextPageError,
	fetchNextPage,
}: {
	children: React.ReactNode;
	pageCount: number;
	hasNextPage: boolean;
	isFetching: boolean;
	isFetchNextPageError: boolean;
	fetchNextPage: () => void;
}) {
	const lastRequestedPageCount = useRef(0);
	const requestNextPage = useCallback(() => {
		if (
			!hasNextPage ||
			isFetching ||
			isFetchNextPageError ||
			lastRequestedPageCount.current >= pageCount
		)
			return;
		lastRequestedPageCount.current = pageCount;
		fetchNextPage();
	}, [fetchNextPage, hasNextPage, isFetching, isFetchNextPageError, pageCount]);

	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel || !hasNextPage || isFetching || isFetchNextPageError) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					observer.disconnect();
					requestNextPage();
				}
			},
			{ rootMargin: "400px" },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasNextPage, isFetching, isFetchNextPageError, requestNextPage]);

	return (
		<div className="flex w-full flex-col gap-12 pb-24 sm:gap-16">
			{children}
			<div
				ref={sentinelRef}
				data-testid="highlight-list-sentinel"
				aria-hidden="true"
				className="h-px"
			/>
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
