"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { BLOG_CATALOG } from "@web-memo/shared/constants";
import type { IFBlogSourceStatus, TBlogId } from "@web-memo/shared/types";
import { getBlogSourceViewState } from "@web-memo/shared/utils";
import { Button } from "@web-memo/ui";
import { BLOG_SOURCE_TITLE_KEYS } from "../_constants";

/**
 * 블로그별 수집 상태 카드.
 * @description 전체 수집이 끝나기 전에는 현재 개수만 보여 주고 분모·퍼센트·총 페이지를 숨긴다.
 * 상태가 바뀌면 스크린 리더가 읽도록 `aria-live`로 둔다.
 */
export default function BlogCollectionStatus({
	lng,
	sources,
	pendingBlogId,
	onResumeClick,
}: IFBlogCollectionStatusProps) {
	const { t } = useTranslation(lng);

	return (
		<section
			aria-label={t("blogs.status.label")}
			aria-live="polite"
			className="rounded-lg border border-border bg-card px-4 py-3"
		>
			{sources.map((source) => {
				const viewState = getBlogSourceViewState(source);
				const name =
					BLOG_CATALOG.find((blog) => blog.blogId === source.blogId)
						?.displayName[lng] ?? source.blogId;
				const isCollectionPending =
					viewState === "waiting" ||
					viewState === "collecting" ||
					viewState === "partialFailed" ||
					viewState === "resumeQueued";
				const canRequestResume =
					viewState === "partialFailed" || viewState === "refreshFailed";

				return (
					<div
						key={source.blogId}
						data-collection-source={source.blogId}
						data-view-state={viewState}
						className="flex items-center justify-between gap-3 border-t border-border py-2 first:border-t-0"
					>
						<div className="min-w-0">
							<p className="font-semibold text-foreground">
								{t(BLOG_SOURCE_TITLE_KEYS[viewState], { name })}
							</p>
							<p className="text-xs text-muted-foreground">
								{source.total !== null
									? t("blogs.status.completeCopy", { total: source.total })
									: t("blogs.status.foundCopy", {
											count: source.collectedCount,
										})}
							</p>
							{viewState === "refreshFailed" && (
								<p className="text-xs text-muted-foreground">
									{t("blogs.status.refreshFailedCopy")}
								</p>
							)}
							{isCollectionPending && (
								<p className="text-xs text-muted-foreground">
									{t("blogs.status.readNow")}
								</p>
							)}
							{viewState === "resumeQueued" && (
								<p className="text-xs text-muted-foreground">
									{t("blogs.status.queuedCopy")}
								</p>
							)}
						</div>
						{canRequestResume && (
							<Button
								variant="outline"
								size="sm"
								disabled={pendingBlogId === source.blogId}
								onClick={() => onResumeClick(source.blogId)}
							>
								{t(
									viewState === "partialFailed"
										? "blogs.status.resume"
										: "blogs.status.retry",
								)}
							</Button>
						)}
					</div>
				);
			})}
		</section>
	);
}

/** 목록 범위의 소스 상태와 수집 재개 동작. */
interface IFBlogCollectionStatusProps extends LanguageType {
	sources: IFBlogSourceStatus[];
	/** 재개 요청을 보내는 중인 블로그. 그 소스의 버튼만 잠근다 */
	pendingBlogId: TBlogId | null;
	onResumeClick: (blogId: TBlogId) => void;
}
