"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type { TBlogReadingSort } from "@web-memo/shared/types";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web-memo/ui";
import { BLOG_READING_SORT_OPTIONS } from "../_constants";

/** 과거부터/최신순 정렬 선택. */
export default function BlogSortSelect({
	lng,
	sort,
	onSortChange,
}: IFBlogSortSelectProps) {
	const { t } = useTranslation(lng);

	return (
		<Select
			value={sort}
			onValueChange={(nextSort) => onSortChange(nextSort as TBlogReadingSort)}
		>
			<SelectTrigger
				aria-label={t("blogs.sortAriaLabel")}
				className="h-8 w-auto min-w-[120px] text-xs"
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{BLOG_READING_SORT_OPTIONS.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{t(option.labelKey)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

/** 현재 정렬과 변경 동작. */
interface IFBlogSortSelectProps extends LanguageType {
	sort: TBlogReadingSort;
	onSortChange: (sort: TBlogReadingSort) => void;
}
