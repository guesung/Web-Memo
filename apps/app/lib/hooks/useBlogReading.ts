import {
	useBlogReadingPageQuery,
	useBlogReadingSummaryQuery,
	useBlogSubscriptionMutation,
	useBlogSyncRequestMutation,
} from "@web-memo/shared/hooks/blog-reading";
import type {
	TBlogId,
	TBlogReadingSort,
} from "@web-memo/shared/types/blog-reading";
import { BlogReadingError } from "@web-memo/shared/utils/services/blog-reading";
import { useEffect, useState } from "react";
import type { TBlogReadingFullState } from "@/components/blog-reading/BlogReadingStateView";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getBlogSummaryTotals } from "@/lib/blogReadingSummary";
import { supabase } from "@/lib/supabase/client";

const NOTICE_DURATION_MS = 3000;

const isErrorCode = (error: Error | null, code: BlogReadingError["code"]) =>
	error instanceof BlogReadingError && error.code === code;

/**
 * 블로그 정주행 화면의 상태·데이터·동작을 한 곳에 모은 훅.
 * @description 목록은 30개 단위 쪽 이동이다. 서버 상태는 shared 훅(TanStack Query)이 갖고,
 * 여기서는 출처 필터·정렬·현재 쪽·안내 문구와 화면 상태 판정만 관리한다.
 * 컴포넌트에서 Supabase를 직접 호출하지 않는다. 사용처: app/blog-reading.tsx
 */
export function useBlogReading() {
	const { session, isLoading: isAuthLoading } = useAuth();
	const userId = session?.user.id;
	const [sourceFilter, setSourceFilter] = useState<TBlogId | null>(null);
	const [sort, setSort] = useState<TBlogReadingSort>("oldest");
	const [pageIndex, setPageIndex] = useState(1);
	const [notice, setNotice] = useState<string | null>(null);

	const summaryQuery = useBlogReadingSummaryQuery({
		supabaseClient: supabase,
		userId,
	});
	const pageQuery = useBlogReadingPageQuery({
		supabaseClient: supabase,
		userId,
		blogId: sourceFilter,
		sort,
	});
	const subscriptionMutation = useBlogSubscriptionMutation({
		supabaseClient: supabase,
		userId,
	});
	const syncRequestMutation = useBlogSyncRequestMutation({
		supabaseClient: supabase,
		userId,
	});

	useEffect(() => {
		if (!notice) {
			return;
		}
		const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);

		return () => clearTimeout(timer);
	}, [notice]);

	const subscribedSources = summaryQuery.data?.sources ?? [];
	const scopeSources = sourceFilter
		? subscribedSources.filter((source) => source.blogId === sourceFilter)
		: subscribedSources;
	const scopeTotals = getBlogSummaryTotals(scopeSources);
	const currentPage = pageQuery.data?.pages[pageIndex - 1];
	const loadedPageCount = pageQuery.data?.pages.length ?? 0;
	const hasNextPage = pageIndex < loadedPageCount || pageQuery.hasNextPage;
	const loadError = pageQuery.error ?? summaryQuery.error;
	const hasData = Boolean(summaryQuery.data && pageQuery.data);
	const hasRefreshFailedSource = scopeSources.some(
		(source) => source.phase === "refresh_failed",
	);

	let fullState: TBlogReadingFullState | null = null;
	if (isAuthLoading) {
		fullState = "loading";
	} else if (!userId || isErrorCode(loadError, "unauthenticated")) {
		fullState = "login";
	} else if (summaryQuery.isPending) {
		fullState = "loading";
	} else if (summaryQuery.isError && !summaryQuery.data) {
		fullState = isErrorCode(summaryQuery.error, "network")
			? "offline"
			: "error";
	} else if (subscribedSources.length === 0) {
		fullState = "empty";
	} else if (pageQuery.isPending) {
		fullState = "loading";
	} else if (pageQuery.isError && !pageQuery.data) {
		fullState = isErrorCode(pageQuery.error, "network") ? "offline" : "error";
	}

	/** 목록을 유지한 채 위에 띄우는 조회 실패 안내. 오프라인이면 기존 캐시를 그대로 보여 준다. */
	let inlineErrorMessage: string | null = null;
	if (hasData && loadError && !fullState) {
		inlineErrorMessage = isErrorCode(loadError, "network")
			? "네트워크 연결을 확인해 주세요. 이전에 불러온 글은 계속 볼 수 있어요."
			: "새 글을 확인하지 못했어요. 이전에 수집한 글은 계속 볼 수 있어요.";
	} else if (hasRefreshFailedSource) {
		inlineErrorMessage =
			"새 글을 확인하지 못했어요. 이전에 수집한 글은 계속 볼 수 있어요.";
	}

	const handleSourceFilterChange = (nextFilter: TBlogId | null) => {
		setSourceFilter(nextFilter);
		setPageIndex(1);
	};

	const handleSortChange = (nextSort: TBlogReadingSort) => {
		setSort(nextSort);
		setPageIndex(1);
	};

	const handlePreviousPage = () => {
		setPageIndex((previous) => Math.max(1, previous - 1));
	};

	const handleNextPage = async () => {
		if (pageIndex < loadedPageCount) {
			setPageIndex(pageIndex + 1);

			return;
		}
		if (!pageQuery.hasNextPage) {
			return;
		}
		const result = await pageQuery.fetchNextPage();
		if (!result.isError) {
			setPageIndex(pageIndex + 1);
		}
	};

	const handleCatalogRefresh = async () => {
		await pageQuery.refreshCatalog();
		setPageIndex(1);
	};

	const handleRetry = () => {
		summaryQuery.refetch();
		pageQuery.refetch();
	};

	const handleSubscriptionToggle = (blogId: TBlogId, active: boolean) => {
		subscriptionMutation.mutate(
			{ blogId, active },
			{
				onSuccess: () => {
					setPageIndex(1);
					if (!active && sourceFilter === blogId) {
						setSourceFilter(null);
					}
				},
				onError: () =>
					setNotice("구독을 변경하지 못했어요. 잠시 후 다시 시도해 주세요."),
			},
		);
	};

	const handleResumeRequest = (blogId: TBlogId) => {
		syncRequestMutation.mutate(
			{ blogId },
			{
				onSuccess: (result) => {
					if (result.status === "running") {
						setNotice("이미 수집 중이에요.");
					} else if (result.status === "throttled") {
						setNotice("방금 요청했어요. 15분 뒤에 다시 요청할 수 있어요.");
					} else {
						setNotice("수집 재개를 요청했어요.");
					}
				},
				onError: () =>
					setNotice(
						"수집 재개를 요청하지 못했어요. 잠시 후 다시 시도해 주세요.",
					),
			},
		);
	};

	return {
		fullState,
		inlineErrorMessage,
		notice,
		setNotice,
		sourceFilter,
		sort,
		pageIndex,
		subscribedSources,
		scopeSources,
		scopeTotals,
		articles: currentPage?.items ?? [],
		isPageLoading: !currentPage && pageQuery.isFetchingNextPage,
		newArticleCount: pageQuery.newArticleCount,
		hasNextPage,
		isFetchingNextPage: pageQuery.isFetchingNextPage,
		isSubscriptionChanging: subscriptionMutation.isPending,
		isResumeRequesting: syncRequestMutation.isPending,
		handleSourceFilterChange,
		handleSortChange,
		handlePreviousPage,
		handleNextPage,
		handleCatalogRefresh,
		handleRetry,
		handleSubscriptionToggle,
		handleResumeRequest,
	};
}
