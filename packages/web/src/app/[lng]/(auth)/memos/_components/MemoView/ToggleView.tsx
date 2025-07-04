"use client";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import { ToggleGroup, ToggleGroupItem } from "@web-memo/ui";
import { Calendar, Grid } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo } from "react";

interface ToggleViewProps extends LanguageType {}

export default memo(function ToggleView({ lng }: ToggleViewProps) {
	const { t } = useTranslation(lng);
	const searchParams = useSearchParams();
	const router = useRouter();

	const handleViewChange = (value: string) => {
		if (!value) return;

		searchParams.set("view", value);
		router.replace(searchParams.getUrl(), { scroll: false });
	};

	return (
		<ToggleGroup type="single" onValueChange={handleViewChange}>
			<ToggleGroupItem value="grid" aria-label={t("memos.grid")}>
				<Grid />
			</ToggleGroupItem>
			<ToggleGroupItem value="calendar" aria-label={t("memos.calendar")}>
				<Calendar />
			</ToggleGroupItem>
		</ToggleGroup>
	);
});
