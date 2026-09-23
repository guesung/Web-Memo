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

	it("분석 대상 필드가 없는 변경에는 이벤트가 없다", () => {
		expect(buildMemoUpdateEvents({})).toEqual([]);
		expect(buildMemoUpdateEvents({ url: "https://example.com" })).toEqual([]);
	});
});
