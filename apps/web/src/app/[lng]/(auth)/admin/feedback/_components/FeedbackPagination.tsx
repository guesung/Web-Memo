"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Button } from "@web-memo/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FeedbackPaginationProps extends LanguageType {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

/** 피드백 목록 페이지 이동 버튼. 한 페이지뿐이면 아무것도 그리지 않는다. */
export default function FeedbackPagination({
	lng,
	currentPage,
	totalPages,
	onPageChange,
}: FeedbackPaginationProps) {
	const { t } = useTranslation(lng);

	if (totalPages <= 1) {
		return null;
	}

	return (
		<div className="flex items-center justify-center gap-2 mt-6">
			<Button
				variant="outline"
				size="sm"
				onClick={() => onPageChange(currentPage - 1)}
				disabled={currentPage <= 1}
			>
				<ChevronLeft className="h-4 w-4" />
				{t("admin.feedback.previous")}
			</Button>
			<span className="text-sm text-muted-foreground px-4">
				{t("admin.feedback.page", {
					current: currentPage,
					total: totalPages,
				})}
			</span>
			<Button
				variant="outline"
				size="sm"
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage >= totalPages}
			>
				{t("admin.feedback.next")}
				<ChevronRight className="h-4 w-4" />
			</Button>
		</div>
	);
}
