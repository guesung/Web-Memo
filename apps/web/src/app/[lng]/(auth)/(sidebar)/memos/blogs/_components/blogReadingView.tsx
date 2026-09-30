"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	BLOG_CATALOG,
	BLOG_READING_PAGE_SIZE,
	PATHS,
} from "@web-memo/shared/constants";
import { Button } from "@web-memo/ui";
import { LogIn, Plus, RotateCw } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import MemoDialog from "../../_components/MemoDialog";
import { useMemoDialog } from "../../_components/MemoView/_hooks";
import { useBlogReading } from "../_hooks";
import { formatBlogDateTime } from "../_utils";
import BlogArticleRow from "./blogArticleRow";
import BlogCollectionStatus from "./blogCollectionStatus";
import BlogPagination from "./blogPagination";
import BlogReadingNotices from "./blogReadingNotices";
import BlogReadingSkeleton from "./blogReadingSkeleton";
import BlogReadingStateMessage from "./blogReadingStateMessage";
import BlogSortSelect from "./blogSortSelect";
import BlogSourceFilter from "./blogSourceFilter";
import BlogSubscriptionsDialog from "./blogSubscriptionsDialog";

/**
 * 블로그 정주행 화면. 구독한 토스·당근의 공개 글을 30개씩 과거부터 이어 읽는다.
 * @description 로그인·첫 로딩·구독 없음·첫 수집 실패는 화면 전체 상태로, 그 밖에는 수집 상태와 목록을 함께 보여 준다.
 */
export default function BlogReadingView({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const reading = useBlogReading(lng);
	const { dialogMemoId } = useMemoDialog();
	const { summaryQuery, pageQuery, totals } = reading;

	if (reading.isUnauthenticated) {
		return (
			<BlogReadingStateMessage
				icon={LogIn}
				title={t("blogs.login.title")}
				description={t("blogs.login.description")}
			>
				<Button asChild>
					<Link href={`/${lng}${PATHS.login}`}>{t("blogs.login.action")}</Link>
				</Button>
			</BlogReadingStateMessage>
		);
	}

	if (summaryQuery.isPending) {
		return <BlogReadingSkeleton lng={lng} />;
	}

	if (!summaryQuery.data) {
		return (
			<BlogReadingStateMessage
				icon={RotateCw}
				title={t("blogs.firstError.title")}
				description={t("blogs.firstError.description")}
			>
				<Button onClick={reading.handleReloadClick}>
					{t("blogs.firstError.retry")}
				</Button>
			</BlogReadingStateMessage>
		);
	}

	const isEveryMemoed =
		totals.total === null &&
		totals.collectedCount > 0 &&
		totals.completedCount >= totals.collectedCount;

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
			<header className="flex items-start justify-between gap-3">
				<div>
					<h2 className="text-2xl font-bold text-foreground">
						{t("blogs.title")}
					</h2>
					<p className="text-muted-foreground">{t("blogs.description")}</p>
				</div>
				<Button onClick={() => reading.setIsDialogOpen(true)}>
					{t("blogs.selectBlogs")}
				</Button>
			</header>

			{reading.summarySources.length === 0 ? (
				<BlogReadingStateMessage
					icon={Plus}
					title={t("blogs.empty.title")}
					description={t("blogs.empty.description")}
				>
					<Button onClick={() => reading.setIsDialogOpen(true)}>
						{t("blogs.selectBlogs")}
					</Button>
				</BlogReadingStateMessage>
			) : (
				<>
					<BlogSourceFilter
						lng={lng}
						subscribedBlogIds={reading.subscribedBlogIds}
						activeBlogFilter={reading.activeBlogFilter}
						onBlogFilterClick={reading.handleBlogFilterClick}
					/>

					{pageQuery.isPending && <BlogReadingSkeleton lng={lng} />}

					{!pageQuery.isPending && !pageQuery.data && (
						<BlogReadingStateMessage
							icon={RotateCw}
							title={t("blogs.firstError.title")}
							description={t(
								reading.isOffline
									? "blogs.offline"
									: "blogs.firstError.description",
							)}
						>
							<Button onClick={reading.handleReloadClick}>
								{t("blogs.firstError.retry")}
							</Button>
						</BlogReadingStateMessage>
					)}

					{pageQuery.data && (
						<>
							<BlogReadingNotices
								lng={lng}
								isOffline={reading.isOffline}
								isRefreshFailed={reading.isRefreshFailed}
								newArticleCount={pageQuery.newArticleCount}
								onReloadClick={reading.handleReloadClick}
								onCatalogRefreshClick={reading.handleCatalogRefreshClick}
							/>

							<BlogCollectionStatus
								lng={lng}
								sources={pageQuery.sources}
								pendingBlogId={reading.pendingSyncBlogId}
								onResumeClick={reading.handleResumeClick}
							/>

							<div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
								<span>
									{totals.lastSuccessAt &&
										t("blogs.lastUpdated", {
											time: formatBlogDateTime({
												isoString: totals.lastSuccessAt,
												lng,
											}),
											interpolation: { escapeValue: false },
										})}
								</span>
								<Button
									variant="ghost"
									size="sm"
									onClick={reading.handleReloadClick}
								>
									{t("blogs.refresh")}
								</Button>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-2">
								<p className="text-xs text-muted-foreground" data-summary>
									{totals.total !== null
										? t("blogs.summaryComplete", {
												total: totals.total,
												todo: totals.total - totals.completedCount,
												done: totals.completedCount,
											})
										: t("blogs.summaryCollecting", {
												total: totals.collectedCount,
												done: totals.completedCount,
											})}
									{isEveryMemoed && (
										<>
											<br />
											{t("blogs.allMemoed")}
										</>
									)}
								</p>
								<BlogSortSelect
									lng={lng}
									sort={reading.sort}
									onSortChange={reading.handleSortChange}
								/>
							</div>

							{reading.currentItems.length === 0 ? (
								<BlogReadingStateMessage
									icon={RotateCw}
									title={t("blogs.noArticles.title")}
									description={t("blogs.noArticles.description")}
								/>
							) : (
								<>
									<ul
										aria-label={t("blogs.list.label")}
										className="overflow-hidden rounded-lg border border-border bg-card"
									>
										{reading.currentItems.map((article) => (
											<BlogArticleRow
												key={`${article.blogId}:${article.providerId}`}
												lng={lng}
												article={article}
												blogName={
													BLOG_CATALOG.find(
														(blog) => blog.blogId === article.blogId,
													)?.displayName[lng] ?? article.blogId
												}
												isMemoPending={reading.pendingMemoUrl === article.url}
												onOpenClick={reading.handleArticleOpenClick}
												onMemoClick={reading.handleMemoClick}
											/>
										))}
									</ul>
									<BlogPagination
										lng={lng}
										pageNumber={reading.pageNumber}
										rangeFrom={reading.rangeFrom}
										rangeTo={reading.rangeTo}
										total={totals.total}
										pageSize={BLOG_READING_PAGE_SIZE}
										hasNextPage={reading.hasNextPage}
										isFetchingNextPage={pageQuery.isFetchingNextPage}
										onPrevClick={reading.handlePrevClick}
										onNextClick={reading.handleNextClick}
									/>
									{totals.total === null && !reading.hasNextPage && (
										<p className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
											{t("blogs.pagination.partialEnd")}
										</p>
									)}
									<p className="text-xs text-muted-foreground">
										{t("blogs.list.hint")}
									</p>
								</>
							)}
						</>
					)}
				</>
			)}

			<BlogSubscriptionsDialog
				lng={lng}
				isOpen={reading.isDialogOpen}
				subscribedBlogIds={reading.subscribedBlogIds}
				isChanging={reading.isSubscriptionChanging}
				onOpenChange={reading.setIsDialogOpen}
				onSubscriptionClick={reading.handleSubscriptionClick}
			/>
			{dialogMemoId && (
				<Suspense fallback={null}>
					<MemoDialog lng={lng} memoId={dialogMemoId} />
				</Suspense>
			)}
		</div>
	);
}
