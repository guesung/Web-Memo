"use client";

import type { LanguageType } from "@src/modules/i18n";
import { Button } from "@web-memo/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface UserPaginationProps extends LanguageType {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

export default function UserPagination({
	lng,
	currentPage,
	totalPages,
	onPageChange,
}: UserPaginationProps) {
	if (totalPages <= 1) return null;

	return (
		<div className="flex items-center justify-center gap-2 mt-6">
			<Button
				variant="outline"
				size="sm"
				onClick={() => onPageChange(currentPage - 1)}
				disabled={currentPage <= 1}
			>
				<ChevronLeft className="h-4 w-4" />
				{lng === "ko" ? "이전" : "Previous"}
			</Button>
			<span className="text-sm text-muted-foreground px-4">
				{lng === "ko"
					? `${currentPage} / ${totalPages} 페이지`
					: `Page ${currentPage} of ${totalPages}`}
			</span>
			<Button
				variant="outline"
				size="sm"
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage >= totalPages}
			>
				{lng === "ko" ? "다음" : "Next"}
				<ChevronRight className="h-4 w-4" />
			</Button>
		</div>
	);
}
