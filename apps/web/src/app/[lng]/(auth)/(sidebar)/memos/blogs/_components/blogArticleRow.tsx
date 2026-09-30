"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type { IFBlogArticleItem } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import { Button } from "@web-memo/ui";
import { Check, ExternalLink } from "lucide-react";
import { formatBlogArticleDate } from "../_utils";

/**
 * 체크리스트 한 행. 완료 표시는 서버가 계산한 값을 읽기 전용으로 보여 주며 사용자가 바꿀 수 없다.
 * @description 완료 글도 제목 대비를 낮추지 않는다. 원문 열기만으로는 완료가 바뀌지 않는다.
 */
export default function BlogArticleRow({
	lng,
	article,
	blogName,
	isMemoPending,
	onOpenClick,
	onMemoClick,
}: IFBlogArticleRowProps) {
	const { t } = useTranslation(lng);
	const publishedDate = formatBlogArticleDate(article.publishedAt);
	const hasMemo = article.memoId !== null;
	const statusLabel = article.completed
		? t("blogs.list.completed")
		: t("blogs.list.notYet");

	return (
		<li className="flex items-start gap-3 border-b border-border p-4 last:border-b-0">
			<span
				role="img"
				aria-label={statusLabel}
				className={cn(
					"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border",
					{
						"border-primary bg-primary text-primary-foreground":
							article.completed,
					},
				)}
			>
				{article.completed && <Check size={14} aria-hidden />}
			</span>
			<div className="min-w-0 flex-1">
				<p className="break-words font-semibold text-foreground">
					{article.title}
				</p>
				<p className="text-xs text-muted-foreground">
					{[blogName, publishedDate].filter(Boolean).join(" · ")}
				</p>
				<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
					<span className="text-xs text-muted-foreground">{statusLabel}</span>
					<div className="flex flex-wrap justify-end gap-1">
						<Button variant="outline" size="sm" asChild>
							<a
								href={article.url}
								target="_blank"
								rel="noopener noreferrer"
								onClick={() => onOpenClick(article)}
								aria-label={t("blogs.list.openArticleLabel", {
									title: article.title,
								})}
							>
								{t("blogs.list.openArticle")}
								<ExternalLink className="ml-1 h-3 w-3" aria-hidden />
							</a>
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={isMemoPending}
							aria-label={t(
								hasMemo
									? "blogs.list.viewMemoLabel"
									: "blogs.list.writeMemoLabel",
								{ title: article.title },
							)}
							onClick={() => onMemoClick(article)}
						>
							{t(hasMemo ? "blogs.list.viewMemo" : "blogs.list.writeMemo")}
						</Button>
					</div>
				</div>
			</div>
		</li>
	);
}

/** 행 하나의 글 정보와 메모 버튼 동작. */
interface IFBlogArticleRowProps extends LanguageType {
	article: IFBlogArticleItem;
	/** 언어에 맞는 블로그 표시명 */
	blogName: string;
	/** 이 행의 메모를 만드는 중이면 버튼을 잠근다 */
	isMemoPending: boolean;
	/** 원문 링크를 눌렀을 때. 링크 이동 자체는 막지 않는다 */
	onOpenClick: (article: IFBlogArticleItem) => void;
	/** 메모 있으면 상세, 없으면 작성으로 이어진다 */
	onMemoClick: (article: IFBlogArticleItem) => void;
}
