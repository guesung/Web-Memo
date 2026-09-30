import { describe, expect, it } from "vitest";
import fixtures from "../../../../supabase-edge-functions/tests/blogReading/fixtures.json";
import { hasMemoContent, hasMemoText } from "./hasMemoContent";

describe("메모 칸 내용 판정 (SQL memo.has_blog_memo_text와 같은 fixture)", () => {
	it.each(fixtures.memoText)("$text", ({ text, hasContent }) => {
		expect(hasMemoText(text)).toBe(hasContent);
	});
});

describe("완료를 만드는 메모 내용", () => {
	const emptyMemo = { memo: "", impression: null, actionItem: null };

	it("세 칸이 모두 비면 완료가 아니다(제목만·빈 위시 행)", () => {
		expect(hasMemoContent(emptyMemo)).toBe(false);
		expect(hasMemoContent({ ...emptyMemo, memo: "  \n" })).toBe(false);
	});

	it.each([
		["memo", { ...emptyMemo, memo: "배운 점" }],
		["impression", { ...emptyMemo, impression: "좋았다" }],
		["actionItem", { ...emptyMemo, actionItem: "적용하기" }],
	])("%s 하나만 있어도 완료다", (_field, memo) => {
		expect(hasMemoContent(memo)).toBe(true);
	});
});
