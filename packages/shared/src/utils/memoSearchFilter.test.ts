import { describe, expect, it } from "vitest";

import { getMemoSearchFilter } from "./memoSearchFilter";

describe("getMemoSearchFilter", () => {
	it("기본값(all)은 title/memo/impression/actionItem 네 컬럼에 대한 ilike OR 필터 문자열을 만든다", () => {
		expect(getMemoSearchFilter("hello")).toBe(
			"title.ilike.%hello%,memo.ilike.%hello%,impression.ilike.%hello%,actionItem.ilike.%hello%",
		);
	});

	it("title 대상은 제목 컬럼만 검색한다", () => {
		expect(getMemoSearchFilter("hello", "title")).toBe("title.ilike.%hello%");
	});

	it("memo 대상은 본문 계열 컬럼(memo/impression/actionItem)만 검색한다", () => {
		expect(getMemoSearchFilter("hello", "memo")).toBe(
			"memo.ilike.%hello%,impression.ilike.%hello%,actionItem.ilike.%hello%",
		);
	});
});
