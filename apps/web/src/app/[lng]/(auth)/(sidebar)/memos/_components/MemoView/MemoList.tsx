"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { analytics } from "@web-memo/shared/modules/analytics";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { Button, Loading } from "@web-memo/ui";
import { Suspense, useEffect, useRef } from "react";
import MemoDialog from "../MemoDialog";
import { useMemoDialog } from "./_hooks";
import MemoEmptyState from "./MemoEmptyState";
import { MemoListSkeleton } from "./MemoListSkeleton";
import MemoSearchEmptyState from "./MemoSearchEmptyState";

/** 메모를 브라우저 현지 작성일로 묶어 상세 화면으로 연결한다. */
const MemoList = (props: IFMemoListProps) => {
	const { t } = useTranslation(props.lng);
	const { dialogMemoId } = useMemoDialog();
	const loadMoreRef = useMemoListPagination(props);
	const dateFormatter = new Intl.DateTimeFormat(props.lng, {
		dateStyle: "long",
	});
	const timeFormatter = new Intl.DateTimeFormat(props.lng, {
		hour: "2-digit",
		minute: "2-digit",
	});
	const groups = groupMemosByDate(props.memos);
	const handleMemoClick = (memoId: number) => {
		analytics.trackEvent({
			name: "memo_open",
			params: { has_search_query: Boolean(props.searchQuery) },
		});
		const nextUrl = new URL(window.location.href);
		nextUrl.searchParams.set("id", String(memoId));
		window.history.pushState({ openedMemoId: memoId }, "", nextUrl);
	};

	return (
		<div
			data-testid="memo-list"
			className="mx-auto w-full max-w-4xl space-y-8 pb-24"
		>
			{props.memos.length === 0 &&
				(props.searchQuery ? (
					<MemoSearchEmptyState
						lng={props.lng}
						searchQuery={props.searchQuery}
					/>
				) : (
					<MemoEmptyState lng={props.lng} />
				))}
			{groups.map((group) => (
				<section
					data-testid="memo-date-group"
					key={group.dateKey}
					aria-labelledby={`memo-date-${group.dateKey}`}
				>
					<h2
						id={`memo-date-${group.dateKey}`}
						className="mb-3 text-sm font-semibold text-muted-foreground"
					>
						{group.dateKey === "unknown" ? (
							t("memos.view.unknownDate")
						) : (
							<time dateTime={group.dateKey}>
								{dateFormatter.format(new Date(`${group.dateKey}T00:00:00`))}
							</time>
						)}
					</h2>
					<ul className="overflow-hidden rounded-xl border bg-card divide-y">
						{group.memos.map((memo) => (
							<li data-testid="memo-list-item" key={memo.id}>
								<button
									type="button"
									onClick={() => handleMemoClick(memo.id)}
									className="w-full min-w-0 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
								>
									<span className="block truncate font-semibold">
										{memo.title || t("memos.view.untitled")}
									</span>
									<span className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
										{memo.memo || t("memos.view.emptyContent")}
									</span>
									<span className="mt-2 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
										<time
											dateTime={memo.created_at ?? undefined}
											className="shrink-0"
										>
											{formatMemoTime(memo.created_at, timeFormatter) ||
												t("memos.view.unknownDate")}
										</time>
										<span aria-hidden="true">·</span>
										<span className="truncate">{getMemoHost(memo.url)}</span>
									</span>
								</button>
							</li>
						))}
					</ul>
				</section>
			))}
			{props.hasNextPage && (
				<div ref={loadMoreRef} className="flex justify-center">
					<Button
						type="button"
						variant="outline"
						disabled={props.isFetchingNextPage}
						onClick={() => props.fetchNextPage()}
					>
						{t("memos.view.loadMore")}
					</Button>
				</div>
			)}
			{props.isFetchingNextPage && <MemoListSkeleton />}
			{dialogMemoId && (
				<Suspense fallback={<Loading />}>
					<MemoDialog lng={props.lng} memoId={dialogMemoId} />
				</Suspense>
			)}
		</div>
	);
};

export default MemoList;

/** 화면 아래에 도달하면 다음 페이지를 가져오며 같은 요청을 중복하지 않는다. */
const useMemoListPagination = ({
	hasNextPage,
	isFetchingNextPage,
	fetchNextPage,
}: IFMemoListProps) => {
	const loadMoreRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const target = loadMoreRef.current;
		if (!target || !hasNextPage || isFetchingNextPage) {
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					observer.disconnect();
					void fetchNextPage();
				}
			},
			{ rootMargin: "300px" },
		);
		observer.observe(target);

		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	return loadMoreRef;
};

/** 페이지 경계와 무관하게 같은 현지 작성일에 속하는 메모를 하나의 그룹으로 합친다. */
const groupMemosByDate = (memos: GetMemoResponse[]) => {
	const groups = new Map<string, GetMemoResponse[]>();
	for (const memo of memos) {
		const date = new Date(memo.created_at ?? "");
		const dateKey = Number.isNaN(date.getTime())
			? "unknown"
			: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		const group = groups.get(dateKey) ?? [];
		group.push(memo);
		groups.set(dateKey, group);
	}

	return Array.from(groups, ([dateKey, groupedMemos]) => ({
		dateKey,
		memos: groupedMemos,
	}));
};

/** 작성일이 없는 기존 메모도 오류 없이 표시한다. */
const formatMemoTime = (
	createdAt: string | null,
	formatter: Intl.DateTimeFormat,
) => {
	const date = new Date(createdAt ?? "");

	return Number.isNaN(date.getTime()) ? "" : formatter.format(date);
};

/** 특수 페이지의 URL도 목록 표시를 중단하지 않고 원문으로 표시한다. */
const getMemoHost = (url: string) => {
	try {
		return new URL(url).hostname || url;
	} catch {
		return url;
	}
};

/** 목록 데이터와 무한 로딩 상태. */
interface IFMemoListProps extends LanguageType {
	memos: GetMemoResponse[];
	searchQuery: string;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	fetchNextPage: () => unknown;
}
