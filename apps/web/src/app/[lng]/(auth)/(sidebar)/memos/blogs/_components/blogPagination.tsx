"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Button } from "@web-memo/ui";

/**
 * 30개 단위 페이지 이동. 이전/다음과 범위(`1–30`)를 보여 준다.
 * @description 전체 수집 전에는 총 글 수·총 쪽 수를 만들어 내지 않고 확보한 범위만 표시한다.
 * `total`이 확정되면 `1–30 / 393개`, `1 / 14쪽` 형태로 바뀐다.
 */
export default function BlogPagination({
	lng,
	pageNumber,
	rangeFrom,
	rangeTo,
	total,
	pageSize,
	hasNextPage,
	isFetchingNextPage,
	onPrevClick,
	onNextClick,
}: IFBlogPaginationProps) {
	const { t } = useTranslation(lng);
	const rangeLabel =
		total === null
			? t("blogs.pagination.range", { from: rangeFrom, to: rangeTo })
			: t("blogs.pagination.rangeWithTotal", {
					from: rangeFrom,
					to: rangeTo,
					total,
				});
	const pageLabel =
		total === null
			? t("blogs.pagination.page", { page: pageNumber })
			: t("blogs.pagination.pageWithTotal", {
					page: pageNumber,
					pages: Math.ceil(total / pageSize),
				});

	return (
		<nav
			aria-label={t("blogs.pagination.label")}
			className="mt-4 flex flex-wrap items-center justify-between gap-2"
		>
			<span className="text-xs text-muted-foreground" data-page-range>
				{rangeLabel}
			</span>
			<span className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={pageNumber === 1}
					onClick={onPrevClick}
				>
					{t("blogs.pagination.prev")}
				</Button>
				<span className="text-xs text-muted-foreground" data-page-label>
					{pageLabel}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={!hasNextPage || isFetchingNextPage}
					onClick={onNextClick}
				>
					{t("blogs.pagination.next")}
				</Button>
			</span>
		</nav>
	);
}

/** 현재 쪽 번호(1부터)와 범위, 확정 총 글 수(수집 완료 전에는 null). */
interface IFBlogPaginationProps extends LanguageType {
	pageNumber: number;
	rangeFrom: number;
	rangeTo: number;
	total: number | null;
	pageSize: number;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onPrevClick: () => void;
	onNextClick: () => void;
}
