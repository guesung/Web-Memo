"use client";

import { useGuide } from "@src/modules/guide";
import type { LanguageType } from "@src/modules/i18n";
import { useDidMount, useMemosQuery } from "@web-memo/shared/hooks";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { SearchFormValues } from "../MemoSearchFormProvider";
import MemoGrid from "./MemoGrid";

const MemoRefreshButton = dynamic(() => import("./MemoRefreshButton"), {
	ssr: false,
});

export default function MemoView({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { watch } = useFormContext<SearchFormValues>();
	const searchParams = useSearchParams();

	const category = searchParams.get("category") ?? "";
	const isWish = searchParams.get("isWish") ?? "";

	const { memos } = useMemosQuery({
		category,
		isWish: isWish === "true",
		searchQuery: watch("searchQuery"),
		searchTarget: watch("searchTarget"),
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
					<div className="flex">
						<MemoRefreshButton lng={lng} />
					</div>
				</div>
			</div>

			<MemoGrid memos={memos} lng={lng} />
		</div>
	);
}
