"use client";

import { useMemosQuery } from "@extension/shared/hooks";
import { useGuide } from "@src/modules/guide";
import type { LanguageType } from "@src/modules/i18n";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { SearchFormValues } from "../MemoSearchFormProvider";
import MemoGrid from "./MemoGrid";

const MemoRefreshButton = dynamic(() => import("./MemoRefreshButton"), {
	ssr: false,
});
const ToggleView = dynamic(() => import("./ToggleView"), {
	ssr: false,
});
const MemoCalendar = dynamic(() => import("./MemoCalendar"), {
	ssr: false,
});

export default function MemoView({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { watch } = useFormContext<SearchFormValues>();
	const searchParams = useSearchParams();

	const category = searchParams.get("category") ?? "";
	const isWish = searchParams.get("isWish") ?? "";
	const view = searchParams.get("view") ?? "grid";

	const { memos } = useMemosQuery({
		category,
		isWish: isWish === "true",
		searchQuery: watch("searchQuery"),
		searchTarget: watch("searchTarget"),
	});

	useGuide({ lng });

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex items-center">
				<div className="flex w-full items-center justify-between">
					<p className="text-muted-foreground select-none text-sm">
						{t("memos.totalMemos", { total: memos.length })}
					</p>
					<div className="flex">
						<MemoRefreshButton lng={lng} />
						<ToggleView lng={lng} />
					</div>
				</div>
			</div>

			{view === "grid" && <MemoGrid memos={memos} lng={lng} />}
			{view === "calendar" && <MemoCalendar lng={lng} memos={memos} />}
		</div>
	);
}
