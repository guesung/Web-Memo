"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Button } from "@web-memo/ui";
import { CalendarDays, Globe, LayoutGrid } from "lucide-react";
import { useSearchParams } from "next/navigation";

/** 검색과 필터를 유지하면서 메모의 카드·날짜별 보기를 전환한다. */
const MemoViewToggle = ({ lng }: LanguageType) => {
	const { t } = useTranslation(lng);
	const searchParams = useSearchParams();
	const view = searchParams.get("view");
	const handleViewChange = (view: "grid" | "list" | "domain") => {
		const nextUrl = new URL(window.location.href);
		nextUrl.searchParams.set("view", view);
		window.history.pushState(null, "", nextUrl);
	};

	return (
		<fieldset
			aria-label={t("memos.view.label")}
			className="flex rounded-lg border p-1"
		>
			<Button
				type="button"
				size="icon"
				variant={view === "list" || view === "domain" ? "ghost" : "secondary"}
				aria-label={t("memos.grid")}
				aria-pressed={view !== "list" && view !== "domain"}
				onClick={() => handleViewChange("grid")}
			>
				<LayoutGrid className="h-4 w-4" aria-hidden="true" />
			</Button>
			<Button
				type="button"
				size="icon"
				variant={view === "list" ? "secondary" : "ghost"}
				aria-label={t("memos.view.byDate")}
				aria-pressed={view === "list"}
				onClick={() => handleViewChange("list")}
			>
				<CalendarDays className="h-4 w-4" aria-hidden="true" />
			</Button>
			<Button
				type="button"
				size="icon"
				variant={view === "domain" ? "secondary" : "ghost"}
				aria-label={t("memos.view.byDomain")}
				aria-pressed={view === "domain"}
				onClick={() => handleViewChange("domain")}
			>
				<Globe className="h-4 w-4" aria-hidden="true" />
			</Button>
		</fieldset>
	);
};

export default MemoViewToggle;
