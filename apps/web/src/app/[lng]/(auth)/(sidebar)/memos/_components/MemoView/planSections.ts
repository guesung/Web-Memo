import type { GetMemoResponse } from "@web-memo/shared/types";
import { getPlanSection, type TPlanDateKey } from "@web-memo/shared/utils";

/** 같은 계획 날짜의 메모 묶음. */
export interface IFPlanDateGroup {
	dateKey: TPlanDateKey;
	memos: GetMemoResponse[];
}

/** 오늘 기준으로 나눈 읽을 계획 구역. */
export interface IFPlanSections {
	/** 최근 날짜가 먼저 */
	past: IFPlanDateGroup[];
	/** 오늘 계획이 없으면 null */
	today: IFPlanDateGroup | null;
	/** 가까운 날짜가 먼저 */
	upcoming: IFPlanDateGroup[];
}

/**
 * 계획 날짜가 있는 메모를 지난 계획·오늘·다가오는 날로 나눠 날짜별로 묶는다.
 * @description 입력은 계획 날짜 오름차순(같은 날짜는 수정 시각 내림차순)이다. 묶을 때 메모 순서를 그대로 유지한다.
 */
export const groupPlannedMemos = (
	memos: GetMemoResponse[],
	todayKey: TPlanDateKey,
): IFPlanSections => {
	const groupsByDate = new Map<TPlanDateKey, GetMemoResponse[]>();
	for (const memo of memos) {
		if (!memo.plannedDate) continue;
		const group = groupsByDate.get(memo.plannedDate) ?? [];
		group.push(memo);
		groupsByDate.set(memo.plannedDate, group);
	}

	const sections: IFPlanSections = { past: [], today: null, upcoming: [] };
	for (const [dateKey, groupedMemos] of groupsByDate) {
		const group = { dateKey, memos: groupedMemos };
		const section = getPlanSection(dateKey, todayKey);
		if (section === "today") {
			sections.today = group;
		} else {
			sections[section].push(group);
		}
	}
	sections.past.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
	sections.upcoming.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

	return sections;
};
