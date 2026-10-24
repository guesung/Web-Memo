"use client";

import type { LanguageType } from "@src/modules/i18n";
import {
	reportMemoLoadStage,
	type TMemoLoadOutcome,
	type TMemoRoute,
} from "@src/modules/observability/client";
import type {
	GetMemoResponse,
	HighlightMemoLink,
	HighlightRow,
} from "@web-memo/shared/types";
import { toPlanDateKey } from "@web-memo/shared/utils";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@web-memo/ui";
import { ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMemoSettings } from "./_hooks/useMemoSettings";
import MemoGroup from "./MemoGroup";
import { groupPlannedMemos, type IFPlanDateGroup } from "./planSections";

/** 읽을 계획 메모를 오늘(브라우저 현지 날짜) 기준 지난 계획·오늘·다가오는 날로 나눠 날짜별로 보여준다. */
const PlanList = ({
	lng,
	memos,
	highlightsByUrl,
	sourcesByMemo,
	loadOutcome,
	route,
	navigationId,
}: IFPlanListProps) => {
	const { t } = useTranslation(lng);
	const { showImpression, showActionItem, truncateMemoContent } =
		useMemoSettings();
	const { past, today, upcoming } = groupPlannedMemos(
		memos,
		toPlanDateKey(new Date()),
	);
	const pastMemoCount = past.reduce(
		(count, group) => count + group.memos.length,
		0,
	);

	useEffect(() => {
		reportMemoLoadStage({
			route,
			navigationId,
			stage: "content_ready",
			outcome: loadOutcome,
		});
	}, [route, navigationId, loadOutcome]);

	const renderGroups = (groups: IFPlanDateGroup[]) =>
		groups.map((group) => (
			<MemoGroup
				key={group.dateKey}
				lng={lng}
				groupKey={group.dateKey}
				memos={group.memos}
				highlightsByUrl={highlightsByUrl}
				sourcesByMemo={sourcesByMemo}
				showImpression={showImpression}
				showActionItem={showActionItem}
				truncateMemoContent={truncateMemoContent}
			/>
		));

	return (
		<div
			data-testid="plan-list"
			className="mx-auto w-full max-w-[1124px] space-y-8 pb-24"
		>
			{past.length > 0 && (
				<Collapsible data-testid="plan-section-past" className="space-y-6">
					<CollapsibleTrigger className="group flex items-center gap-1 rounded text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
						<ChevronRight
							className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90"
							aria-hidden="true"
						/>
						{t("memos.plan.sectionPast", { count: pastMemoCount })}
					</CollapsibleTrigger>
					<CollapsibleContent className="space-y-8">
						{renderGroups(past)}
					</CollapsibleContent>
				</Collapsible>
			)}
			<section data-testid="plan-section-today" className="space-y-4">
				<h2 className="text-base font-bold">{t("memos.plan.sectionToday")}</h2>
				{today ? (
					renderGroups([today])
				) : (
					<p className="text-sm text-muted-foreground">
						{t("memos.plan.todayEmpty")}
					</p>
				)}
			</section>
			{upcoming.length > 0 && (
				<section data-testid="plan-section-upcoming" className="space-y-4">
					<h2 className="text-base font-bold">
						{t("memos.plan.sectionUpcoming")}
					</h2>
					<div className="space-y-8">{renderGroups(upcoming)}</div>
				</section>
			)}
		</div>
	);
};

export default PlanList;

/** 읽을 계획 목록의 데이터와 관측 정보. */
interface IFPlanListProps extends LanguageType {
	memos: GetMemoResponse[];
	highlightsByUrl: Map<string, HighlightRow[]>;
	sourcesByMemo: Map<number, HighlightMemoLink>;
	loadOutcome: TMemoLoadOutcome;
	route: TMemoRoute;
	navigationId: number | null;
}
