import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { BLOG_READING_PAGE_SIZE } from "@web-memo/shared/constants";
import {
	useBlogReadingPageQuery,
	useBlogReadingSummaryQuery,
	useBlogSubscriptionMutation,
	useBlogSyncRequestMutation,
	useMemoPostMutation,
	useSupabaseClientQuery,
	useSupabaseUserQuery,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type {
	IFBlogArticleItem,
	IFBlogSyncRequestResult,
	TBlogId,
	TBlogReadingSort,
} from "@web-memo/shared/types";
import { BlogReadingError } from "@web-memo/shared/utils";
import { toast } from "@web-memo/ui";
import { useState } from "react";
import { formatBlogDateTime, getBlogScopeTotals } from "../_utils";

/**
 * 블로그 정주행 화면의 서버 상태·필터·쪽 이동·메모 열기를 한곳에서 다룬다.
 * @description 쪽 이동은 무한 조회가 쌓은 페이지 배열을 인덱스로 짚는다. 필터·정렬이 바뀌면 다른 캐시라 첫 쪽으로 돌아간다.
 * 완료 표시는 서버 응답 그대로이며, 저장하지 않은 초안으로 완료를 앞당기지 않는다.
 */
export const useBlogReading = (lng: Language) => {
	const { t } = useTranslation(lng);
	const { data: supabaseClient } = useSupabaseClientQuery();
	const { user } = useSupabaseUserQuery();
	const userId = user.data.user?.id ?? null;

	const [blogFilter, setBlogFilter] = useState<TBlogId | null>(null);
	const [sort, setSort] = useState<TBlogReadingSort>("oldest");
	const [pageIndex, setPageIndex] = useState(0);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const summaryQuery = useBlogReadingSummaryQuery({ supabaseClient, userId });
	const summarySources = summaryQuery.data?.sources ?? [];
	const subscribedBlogIds = summarySources.map((source) => source.blogId);
	// 구독을 해제한 블로그가 필터로 남아 있으면 전체로 되돌린다.
	const activeBlogFilter =
		blogFilter !== null && subscribedBlogIds.includes(blogFilter)
			? blogFilter
			: null;

	const pageQuery = useBlogReadingPageQuery({
		supabaseClient,
		userId,
		blogId: activeBlogFilter,
		sort,
	});
	const subscriptionMutation = useBlogSubscriptionMutation({
		supabaseClient,
		userId,
	});
	const syncRequestMutation = useBlogSyncRequestMutation({
		supabaseClient,
		userId,
	});
	const memoPostMutation = useMemoPostMutation();
	const searchParams = useSearchParams();

	const loadedPages = pageQuery.data?.pages ?? [];
	const safePageIndex = Math.min(
		pageIndex,
		Math.max(loadedPages.length - 1, 0),
	);
	const currentItems = loadedPages[safePageIndex]?.items ?? [];
	const rangeFrom = safePageIndex * BLOG_READING_PAGE_SIZE + 1;
	const totals = getBlogScopeTotals({
		pageSources: pageQuery.sources,
		summarySources,
		blogId: activeBlogFilter,
	});
	const pageError = pageQuery.error;
	const isOffline =
		pageError instanceof BlogReadingError && pageError.code === "network";
	const isUnauthenticated =
		!userId ||
		(summaryQuery.error instanceof BlogReadingError &&
			summaryQuery.error.code === "unauthenticated");

	const openMemoDialog = (memoId: number) => {
		searchParams.set("id", String(memoId));
		history.pushState({ openedMemoId: memoId }, "", searchParams.getUrl());
	};

	const getSyncToastTitle = (result: IFBlogSyncRequestResult): string => {
		if (result.status === "running") {
			return t("blogs.sync.running");
		}

		if (result.status === "throttled") {
			return result.nextRequestAt
				? t("blogs.sync.throttledAt", {
						time: formatBlogDateTime({ isoString: result.nextRequestAt, lng }),
						interpolation: { escapeValue: false },
					})
				: t("blogs.sync.throttled");
		}

		return t("blogs.sync.queued");
	};

	const handleSortChange = (nextSort: TBlogReadingSort) => {
		setSort(nextSort);
		setPageIndex(0);
	};

	const handleBlogFilterClick = (nextBlogFilter: TBlogId | null) => {
		setBlogFilter(nextBlogFilter);
		setPageIndex(0);
	};

	const handlePrevClick = () => {
		setPageIndex(Math.max(safePageIndex - 1, 0));
	};

	const handleNextClick = async () => {
		if (safePageIndex < loadedPages.length - 1) {
			setPageIndex(safePageIndex + 1);

			return;
		}

		const result = await pageQuery.fetchNextPage();

		if (!result.isError) {
			setPageIndex(safePageIndex + 1);
		}
	};

	const handleCatalogRefreshClick = async () => {
		await pageQuery.refreshCatalog();
		setPageIndex(0);
	};

	const handleReloadClick = () => {
		void pageQuery.refetch();
		void summaryQuery.refetch();
	};

	const handleResumeClick = (blogId: TBlogId) => {
		syncRequestMutation.mutate(
			{ blogId },
			{
				onSuccess: (result) => toast({ title: getSyncToastTitle(result) }),
				onError: () => toast({ title: t("blogs.sync.failed") }),
			},
		);
	};

	const handleSubscriptionClick = (params: {
		blogId: TBlogId;
		active: boolean;
	}) => {
		subscriptionMutation.mutate(params, {
			onError: () => toast({ title: t("blogs.dialog.failed") }),
		});
	};

	const handleMemoClick = (article: IFBlogArticleItem) => {
		if (article.memoId !== null) {
			openMemoDialog(article.memoId);

			return;
		}

		// 웹에는 메모 작성 화면이 따로 없어 빈 메모를 만든 뒤 기존 MemoDialog로 채운다.
		// 내용이 비어 있는 동안은 완료가 아니다.
		memoPostMutation.mutate(
			{ url: article.url, title: article.title, memo: "" },
			{
				onSuccess: (result) => {
					const createdMemoId = result.data?.[0]?.id;

					if (createdMemoId !== undefined) {
						openMemoDialog(createdMemoId);
					}
				},
				onError: () => toast({ title: t("blogs.list.memoCreateFailed") }),
			},
		);
	};

	return {
		summaryQuery,
		pageQuery,
		summarySources,
		subscribedBlogIds,
		activeBlogFilter,
		sort,
		isDialogOpen,
		setIsDialogOpen,
		currentItems,
		pageNumber: safePageIndex + 1,
		rangeFrom,
		rangeTo: rangeFrom + currentItems.length - 1,
		hasNextPage:
			safePageIndex < loadedPages.length - 1 || Boolean(pageQuery.hasNextPage),
		totals,
		isOffline,
		isUnauthenticated,
		isRefreshFailed:
			pageQuery.sources.some((source) => source.phase === "refresh_failed") ||
			(pageQuery.isRefetchError && !isOffline),
		isSubscriptionChanging: subscriptionMutation.isPending,
		pendingSyncBlogId: syncRequestMutation.isPending
			? (syncRequestMutation.variables?.blogId ?? null)
			: null,
		pendingMemoUrl: memoPostMutation.isPending
			? (memoPostMutation.variables?.url ?? null)
			: null,
		handleSortChange,
		handleBlogFilterClick,
		handlePrevClick,
		handleNextClick,
		handleCatalogRefreshClick,
		handleReloadClick,
		handleResumeClick,
		handleSubscriptionClick,
		handleMemoClick,
	};
};
