"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
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
	const { t } = useTranslation(lng);

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
				{t("admin.users.previous")}
			</Button>
			<span className="text-sm text-muted-foreground px-4">
				{t("admin.users.page", { current: currentPage, total: totalPages })}
			</span>
			<Button
				variant="outline"
				size="sm"
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage >= totalPages}
			>
				{t("admin.users.next")}
				<ChevronRight className="h-4 w-4" />
			</Button>
		</div>
	);
}
