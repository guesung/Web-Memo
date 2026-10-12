import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildMemoUpdateEvents } from "./memoUpdateEvents";

describe("메모 변경 이벤트 해석", () => {
	it("상태·카테고리·본문 이벤트의 순서와 본문 필드 정렬을 유지한다", () => {
		expect(
			buildMemoUpdateEvents({
				isWish: false,
				isStar: true,
				isReading: false,
				category_id: null,
				title: "",
				memo: "내용",
				actionItem: "할 일",
			}),
		).toEqual([
			{
				name: "memo_status_toggle",
				params: { status: "wish", enabled: false },
			},
			{ name: "memo_status_toggle", params: { status: "star", enabled: true } },
			{
				name: "memo_status_toggle",
				params: { status: "reading", enabled: false },
			},
			{ name: "memo_category_change" },
			{ name: "memo_write", params: { fields: "actionItem,memo,title" } },
		]);
	});

	it("카테고리 변경 경로를 넘기면 source로 싣는다", () => {
		expect(
			buildMemoUpdateEvents({ category_id: 3 }, { categorySource: "button" }),
		).toEqual([{ name: "memo_category_change", params: { source: "button" } }]);
	});

	it("카테고리 키가 없으면 경로를 넘겨도 카테고리 이벤트가 없다", () => {
		expect(
			buildMemoUpdateEvents({ memo: "내용" }, { categorySource: "hash" }),
		).toEqual([{ name: "memo_write", params: { fields: "memo" } }]);
	});

	it("분석 대상 필드가 없는 변경에는 이벤트가 없다", () => {
		expect(buildMemoUpdateEvents({})).toEqual([]);
		expect(buildMemoUpdateEvents({ url: "https://example.com" })).toEqual([]);
	});

	describe("읽을 계획 날짜", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date(2026, 9, 11, 15, 30));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("날짜를 배정하면 오늘과의 일수 차이만 싣는다", () => {
			expect(buildMemoUpdateEvents({ plannedDate: "2026-10-11" })).toEqual([
				{
					name: "memo_plan_change",
					params: { action: "set", days_ahead: 0 },
				},
			]);
			expect(buildMemoUpdateEvents({ plannedDate: "2026-10-18" })).toEqual([
				{
					name: "memo_plan_change",
					params: { action: "set", days_ahead: 7 },
				},
			]);
		});

		it("날짜를 해제하면 days_ahead 없이 clear로 보낸다", () => {
			expect(buildMemoUpdateEvents({ plannedDate: null })).toEqual([
				{ name: "memo_plan_change", params: { action: "clear" } },
			]);
		});

		it("plannedDate 키가 없거나 undefined면 이벤트가 없다", () => {
			expect(buildMemoUpdateEvents({ memo: "내용" })).toEqual([
				{ name: "memo_write", params: { fields: "memo" } },
			]);
			expect(buildMemoUpdateEvents({ plannedDate: undefined })).toEqual([]);
		});
	});
});
