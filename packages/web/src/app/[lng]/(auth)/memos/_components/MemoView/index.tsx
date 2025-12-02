"use client";

import { useGuide } from "@src/modules/guide";
import type { LanguageType } from "@src/modules/i18n";
import { useDidMount, useMemosInfiniteQuery } from "@web-memo/shared/hooks";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import {
	Button,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@web-memo/ui";
import { Keyboard } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { SearchFormValues } from "../MemoSearchFormProvider";
import { useViewMode } from "./_hooks";
import MemoGrid from "./MemoGrid";
import MemoKeyboardShortcuts from "./MemoKeyboardShortcuts";
import MemoList from "./MemoList";
import ViewModeToggle from "./ViewModeToggle";

const MemoRefreshButton = dynamic(() => import("./MemoRefreshButton"), {
	ssr: false,
});

export default function MemoView({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { watch } = useFormContext<SearchFormValues>();
	const searchParams = useSearchParams();
	const [showShortcuts, setShowShortcuts] = useState(false);
	const { viewMode } = useViewMode();

	const category = searchParams.get("category") ?? "";
	const isWish = searchParams.get("isWish") ?? "";
	const searchQuery = watch("searchQuery");

	const { memos, totalCount, hasNextPage, isFetchingNextPage, fetchNextPage } =
		useMemosInfiniteQuery({
			category,
			isWish: isWish === "true",
			searchQuery: searchQuery || undefined,
		});

	useGuide({ lng });
	useDidMount(() => ExtensionBridge.requestSyncLoginStatus());

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex items-center">
				<div className="flex w-full items-center justify-between">
					<p className="text-muted-foreground select-none text-sm flex items-center gap-2">
						<span className="w-2 h-2 bg-primary rounded-full" />
						{t("memos.totalMemos", { total: totalCount })}
					</p>
					<div className="flex items-center gap-2">
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
				<MemoGrid
					lng={lng}
					memos={memos}
					hasNextPage={hasNextPage}
					isFetchingNextPage={isFetchingNextPage}
					fetchNextPage={fetchNextPage}
				/>
			) : (
				<MemoList
					lng={lng}
					memos={memos}
					hasNextPage={hasNextPage}
					isFetchingNextPage={isFetchingNextPage}
					fetchNextPage={fetchNextPage}
				/>
			)}

			<MemoKeyboardShortcuts
				lng={lng}
				open={showShortcuts}
				onOpenChange={setShowShortcuts}
			/>
		</div>
	);
}
