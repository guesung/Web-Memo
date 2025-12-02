"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	ToggleGroup,
	ToggleGroupItem,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@web-memo/ui";
import { Grid3X3, List } from "lucide-react";
import { memo } from "react";

import { useViewMode, type ViewMode } from "./_hooks";

interface ViewModeToggleProps extends LanguageType {}

export default memo(function ViewModeToggle({ lng }: ViewModeToggleProps) {
	const { t } = useTranslation(lng);
	const { viewMode, setViewMode } = useViewMode();

	const handleViewChange = (value: string) => {
		if (!value) return;
		setViewMode(value as ViewMode);
	};

	return (
		<ToggleGroup
			type="single"
			value={viewMode}
			onValueChange={handleViewChange}
			className="bg-muted rounded-lg p-0.5"
		>
			<Tooltip>
				<TooltipTrigger asChild>
					<ToggleGroupItem
						value="grid"
						aria-label={t("memos.viewMode.grid")}
						className="h-8 w-8 data-[state=on]:bg-background data-[state=on]:shadow-sm"
					>
						<Grid3X3 className="h-4 w-4" />
					</ToggleGroupItem>
				</TooltipTrigger>
				<TooltipContent side="bottom">
					<p>{t("memos.viewMode.grid")}</p>
				</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<ToggleGroupItem
						value="list"
						aria-label={t("memos.viewMode.list")}
						className="h-8 w-8 data-[state=on]:bg-background data-[state=on]:shadow-sm"
					>
						<List className="h-4 w-4" />
					</ToggleGroupItem>
				</TooltipTrigger>
				<TooltipContent side="bottom">
					<p>{t("memos.viewMode.list")}</p>
				</TooltipContent>
			</Tooltip>
		</ToggleGroup>
	);
});
