"use client";

import type { LanguageType } from "@src/modules/i18n";
import {
	getMemoNavigationId,
	reportMemoLoadStage,
	type TMemoLoadOutcome,
	type TMemoRoute,
} from "@src/modules/observability/client";
import { usePlannedMemosQuery } from "@web-memo/shared/hooks";
import { useEffect } from "react";
import { useMemoSearchConditions } from "./_hooks";
import MemoSearchEmptyState from "./MemoSearchEmptyState";
import MemoViewFrame from "./MemoViewFrame";
import PlanEmptyState from "./PlanEmptyState";
import PlanList from "./PlanList";

const PLAN_ROUTE: TMemoRoute = "/memos/plan";

/** 읽을 계획 탭. 계획 날짜가 있는 메모를 한 번에 불러와 구역별로 보여준다. */
const PlanMemoView = ({ lng }: LanguageType) => {
	const { category, searchQuery } = useMemoSearchConditions();
	const { data, memos } = usePlannedMemosQuery({
		category,
		searchQuery: searchQuery || undefined,
	});
	const loadOutcome: TMemoLoadOutcome = data.error
		? "error"
		: memos.length === 0
			? "empty"
			: "success";
	const navigationId = getMemoNavigationId(PLAN_ROUTE);
	useEffect(() => {
		reportMemoLoadStage({
			route: PLAN_ROUTE,
			navigationId,
			stage: "data_ready",
			outcome: loadOutcome,
		});
	}, [navigationId, loadOutcome]);

	return (
		<MemoViewFrame
			lng={lng}
			memos={memos}
			totalCount={memos.length}
			isListControlsVisible={false}
		>
			{({ highlightsByUrl, sourcesByMemo }) =>
				memos.length === 0 ? (
					searchQuery ? (
						<MemoSearchEmptyState lng={lng} searchQuery={searchQuery} />
					) : (
						<PlanEmptyState lng={lng} />
					)
				) : (
					<PlanList
						lng={lng}
						memos={memos}
						highlightsByUrl={highlightsByUrl}
						sourcesByMemo={sourcesByMemo}
						loadOutcome={loadOutcome}
						route={PLAN_ROUTE}
						navigationId={navigationId}
					/>
				)
			}
		</MemoViewFrame>
	);
};

export default PlanMemoView;
