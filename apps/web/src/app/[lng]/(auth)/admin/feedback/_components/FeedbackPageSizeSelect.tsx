"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web-memo/ui";

import { FEEDBACK_PAGE_SIZES } from "../_constants";

interface FeedbackPageSizeSelectProps extends LanguageType {
	pageSize: number;
	onPageSizeChange: (pageSize: number) => void;
}

/** 피드백 목록 한 페이지에 보여줄 개수를 고르는 드롭다운 */
export default function FeedbackPageSizeSelect({
	lng,
	pageSize,
	onPageSizeChange,
}: FeedbackPageSizeSelectProps) {
	const { t } = useTranslation(lng);

	const handlePageSizeValueChange = (value: string) => {
		onPageSizeChange(Number(value));
	};

	return (
		<div className="flex items-center gap-2">
			<span className="text-sm text-muted-foreground">
				{t("admin.feedback.page_size_label")}
			</span>
			<Select
				value={String(pageSize)}
				onValueChange={handlePageSizeValueChange}
			>
				<SelectTrigger className="w-20">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{FEEDBACK_PAGE_SIZES.map((size) => (
						<SelectItem key={size} value={String(size)}>
							{t("admin.feedback.page_size_option", { count: size })}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
