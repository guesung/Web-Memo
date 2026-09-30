"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { BLOG_CATALOG } from "@web-memo/shared/constants";
import type { TBlogId } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import { Button } from "@web-memo/ui";

/** 출처 필터(전체 + 구독한 블로그). 현재 선택은 `aria-pressed`로 알린다. */
export default function BlogSourceFilter({
	lng,
	subscribedBlogIds,
	activeBlogFilter,
	onBlogFilterClick,
}: IFBlogSourceFilterProps) {
	const { t } = useTranslation(lng);

	return (
		<fieldset
			aria-label={t("blogs.filterLabel")}
			className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0"
		>
			<Button
				variant="outline"
				size="sm"
				aria-pressed={activeBlogFilter === null}
				className={cn({
					"border-primary bg-accent text-primary": activeBlogFilter === null,
				})}
				onClick={() => onBlogFilterClick(null)}
			>
				{t("blogs.filterAll")}
			</Button>
			{BLOG_CATALOG.filter((blog) =>
				subscribedBlogIds.includes(blog.blogId),
			).map((blog) => (
				<Button
					key={blog.blogId}
					variant="outline"
					size="sm"
					aria-pressed={activeBlogFilter === blog.blogId}
					className={cn({
						"border-primary bg-accent text-primary":
							activeBlogFilter === blog.blogId,
					})}
					onClick={() => onBlogFilterClick(blog.blogId)}
				>
					{blog.displayName[lng]}
				</Button>
			))}
		</fieldset>
	);
}

/** 구독 중인 블로그와 현재 선택(null이면 전체). */
interface IFBlogSourceFilterProps extends LanguageType {
	subscribedBlogIds: TBlogId[];
	activeBlogFilter: TBlogId | null;
	onBlogFilterClick: (blogId: TBlogId | null) => void;
}
