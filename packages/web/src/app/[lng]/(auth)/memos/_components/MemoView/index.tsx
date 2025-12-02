"use client";

import { useGuide } from "@src/modules/guide";
import type { LanguageType } from "@src/modules/i18n";
import { useDidMount, useMemosQuery } from "@web-memo/shared/hooks";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import {
	Button,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@web-memo/ui";
import { ArrowDownAZ, ArrowUpDown, Keyboard } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { SearchFormValues, SortByType } from "../MemoSearchFormProvider";
import { useViewMode } from "./_hooks";
import MemoGrid from "./MemoGrid";
import MemoKeyboardShortcuts from "./MemoKeyboardShortcuts";
import MemoList from "./MemoList";
import ViewModeToggle from "./ViewModeToggle";

const MemoRefreshButton = dynamic(() => import("./MemoRefreshButton"), {
	ssr: false,
});

const SORT_OPTIONS: { value: SortByType; icon: typeof ArrowUpDown }[] = [
	{ value: "updatedAt", icon: ArrowUpDown },
	{ value: "createdAt", icon: ArrowUpDown },
	{ value: "title", icon: ArrowDownAZ },
];

export default function MemoView({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { watch, control } = useFormContext<SearchFormValues>();
	const searchParams = useSearchParams();
	const [showShortcuts, setShowShortcuts] = useState(false);
	const { viewMode } = useViewMode();

	const category = searchParams.get("category") ?? "";
	const isWish = searchParams.get("isWish") ?? "";

	const { memos } = useMemosQuery({
		category,
		isWish: isWish === "true",
		searchQuery: watch("searchQuery"),
		searchTarget: watch("searchTarget"),
		sortBy: watch("sortBy"),
		sortOrder: watch("sortOrder"),
	});

	useGuide({ lng });
	useDidMount(() => ExtensionBridge.requestSyncLoginStatus());

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex items-center">
				<div className="flex w-full items-center justify-between">
					<p className="text-muted-foreground select-none text-sm flex items-center gap-2">
						<span className="w-2 h-2 bg-primary rounded-full" />
						{t("memos.totalMemos", { total: memos.length })}
					</p>
					<div className="flex items-center gap-2">
						<Controller
							name="sortBy"
							control={control}
							render={({ field }) => (
								<Select onValueChange={field.onChange} value={field.value}>
									<SelectTrigger className="w-[140px] h-9 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{SORT_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												<span className="flex items-center gap-2">
													<option.icon className="h-3.5 w-3.5" />
													{t(`memos.sort.${option.value}`)}
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="icon"
									variant="outline"
									className="h-9 w-9"
									onClick={() => setShowShortcuts(true)}
								>
									<Keyboard className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>{t("memos.shortcuts.label")}</p>
							</TooltipContent>
						</Tooltip>
						<ViewModeToggle lng={lng} />
						<MemoRefreshButton lng={lng} />
					</div>
				</div>
			</div>

			{viewMode === "grid" ? (
				<MemoGrid memos={memos} lng={lng} />
			) : (
				<MemoList memos={memos} lng={lng} />
			)}

			<MemoKeyboardShortcuts
				lng={lng}
				open={showShortcuts}
				onOpenChange={setShowShortcuts}
			/>
		</div>
	);
}
