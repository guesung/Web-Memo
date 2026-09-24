import { describe, expect, it } from "vitest";
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
});
