"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	HIGHLIGHT_COLOR_STYLE,
	HIGHLIGHT_COLORS,
	type HighlightColor,
} from "@web-memo/shared/constants";
import { cn } from "@web-memo/shared/utils";
import { Input } from "@web-memo/ui";
import { Search } from "lucide-react";

interface HighlightFilterBarProps {
	lng: Language;
	searchInput: string;
	selectedColor?: HighlightColor;
	onSearchInputChange: (value: string) => void;
	onColorChange: (color?: HighlightColor) => void;
}

/** 하이라이트 목록 상단의 검색창과 색상 칩. */
export function HighlightFilterBar({
	lng,
	searchInput,
	selectedColor,
	onSearchInputChange,
	onColorChange,
}: HighlightFilterBarProps) {
	const { t } = useTranslation(lng);

	return (
		<div className="flex flex-col gap-3">
			<div className="relative">
				<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={searchInput}
					onChange={(event) => onSearchInputChange(event.target.value)}
					placeholder={t("highlight.search.placeholder")}
					aria-label={t("highlight.search.placeholder")}
					className="h-11 rounded-xl pl-9"
				/>
			</div>

			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					onClick={() => onColorChange(undefined)}
					aria-pressed={selectedColor === undefined}
					className={cn(
						"rounded-full border px-3 py-1 text-xs transition-colors",
						selectedColor === undefined
							? "border-foreground bg-foreground text-background"
							: "border-border text-muted-foreground hover:border-foreground",
					)}
				>
					{t("highlight.color.all")}
				</button>
				{HIGHLIGHT_COLORS.map((color) => (
					<button
						key={color}
						type="button"
						onClick={() => onColorChange(color)}
						aria-pressed={selectedColor === color}
						aria-label={color}
						className={cn(
							"flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
							selectedColor === color
								? "border-foreground bg-foreground text-background"
								: "border-border text-muted-foreground hover:border-foreground",
						)}
					>
						<span
							aria-hidden
							className="size-3 rounded-full"
							style={{ backgroundColor: HIGHLIGHT_COLOR_STYLE[color].bar }}
						/>
						{color}
					</button>
				))}
			</div>
		</div>
	);
}
