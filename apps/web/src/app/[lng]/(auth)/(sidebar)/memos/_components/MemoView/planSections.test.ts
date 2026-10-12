import type { GetMemoResponse } from "@web-memo/shared/types";
import { describe, expect, it, vi } from "vitest";
import { groupPlannedMemos } from "./planSections";

vi.mock("@web-memo/shared/utils", async () => {
	return import(
		"../../../../../../../../../../packages/shared/src/utils/planDate"
	);
});

const memo = (id: number, plannedDate: string | null) =>
	({ id, plannedDate }) as GetMemoResponse;

describe("groupPlannedMemos", () => {
	it("지난 계획은 최근 날짜 먼저, 다가오는 날은 가까운 날짜 먼저로 나눈다", () => {
		const sections = groupPlannedMemos(
			[
				memo(1, "2026-10-01"),
				memo(2, "2026-10-09"),
				memo(3, "2026-10-11"),
				memo(4, "2026-10-12"),
				memo(5, "2026-10-20"),
			],
			"2026-10-11",
		);

		expect(sections.past.map((group) => group.dateKey)).toEqual([
			"2026-10-09",
			"2026-10-01",
		]);
		expect(sections.today?.memos.map((item) => item.id)).toEqual([3]);
		expect(sections.upcoming.map((group) => group.dateKey)).toEqual([
			"2026-10-12",
			"2026-10-20",
		]);
	});

	it("같은 날짜의 메모는 들어온 순서를 유지하고, 오늘 계획이 없으면 today는 null이다", () => {
		const sections = groupPlannedMemos(
			[memo(2, "2026-10-12"), memo(1, "2026-10-12")],
			"2026-10-11",
		);

		expect(sections.today).toBeNull();
		expect(sections.upcoming[0].memos.map((item) => item.id)).toEqual([2, 1]);
	});
});
