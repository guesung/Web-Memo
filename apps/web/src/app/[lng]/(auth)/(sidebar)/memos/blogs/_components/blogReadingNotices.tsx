"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Button } from "@web-memo/ui";
import { CircleAlert } from "lucide-react";

/**
 * 목록 위 안내 묶음: 오프라인, 새 글 확인 실패, 새로 가져온 글.
 * @description 세 안내 모두 기존 목록을 그대로 두고 그 위에 얹는다. 새 글은 '목록 갱신'을 눌러야 반영한다.
 */
export default function BlogReadingNotices({
	lng,
	isOffline,
	isRefreshFailed,
	newArticleCount,
	onReloadClick,
	onCatalogRefreshClick,
}: IFBlogReadingNoticesProps) {
	const { t } = useTranslation(lng);

	return (
		<>
			{isOffline && (
				<output className="block rounded-lg border border-border bg-muted p-3 text-xs text-foreground">
					{t("blogs.offline")}
				</output>
			)}
			{isRefreshFailed && (
				<div
					role="alert"
					className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted p-3"
				>
					<div className="flex items-start gap-2 text-xs text-foreground">
						<CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
						<p>
							{t("blogs.refreshError.message")}
							<br />
							{t("blogs.refreshError.description")}
						</p>
					</div>
					<Button variant="outline" size="sm" onClick={onReloadClick}>
						{t("blogs.refreshError.retry")}
					</Button>
				</div>
			)}
			{newArticleCount > 0 && (
				<output className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted p-3 text-xs text-foreground">
					<span>
						{t("blogs.newArticles.message", { count: newArticleCount })}
					</span>
					<Button variant="outline" size="sm" onClick={onCatalogRefreshClick}>
						{t("blogs.newArticles.refresh")}
					</Button>
				</output>
			)}
		</>
	);
}

/** 표시할 안내 조건과 동작. */
interface IFBlogReadingNoticesProps extends LanguageType {
	isOffline: boolean;
	isRefreshFailed: boolean;
	newArticleCount: number;
	onReloadClick: () => void;
	onCatalogRefreshClick: () => void;
}
