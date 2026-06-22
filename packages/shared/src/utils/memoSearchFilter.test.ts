import { describe, expect, it } from "vitest";

import { getMemoSearchFilter } from "./memoSearchFilter";

describe("getMemoSearchFilter", () => {
	it("title/memo/impression/actionItem 네 컬럼에 대한 ilike OR 필터 문자열을 만든다", () => {
		expect(getMemoSearchFilter("hello")).toBe(
			"title.ilike.%hello%,memo.ilike.%hello%,impression.ilike.%hello%,actionItem.ilike.%hello%",
		);
	});
});
