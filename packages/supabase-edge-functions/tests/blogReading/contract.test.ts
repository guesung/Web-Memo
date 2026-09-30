import { describe, expect, it } from "vitest";

import { getPageKey } from "../../../shared/src/utils/Url";
import fixtures from "./fixtures.json";

/**
 * 블로그 정주행 정규화 계약의 JS 쪽 검증.
 * 같은 fixtures.json을 blogReading.test.sql이 SQL 함수(memo.blog_page_key, memo.has_blog_memo_text)로 검증한다.
 * 두 쪽이 같은 입력에서 같은 답을 내야 빈 page_key 구형 메모와 정상 메모의 완료 판정이 어긋나지 않는다.
 */
describe("블로그 정주행 정규화 계약 (SQL과 같은 fixture)", () => {
	it.each(fixtures.pageKey)("getPageKey($url)", ({ url, expected }) => {
		expect(getPageKey(url)).toBe(expected);
	});

	it.each(fixtures.memoText)("trim 후 내용 있음: $text", ({ text, hasContent }) => {
		expect((text ?? "").trim().length > 0).toBe(hasContent);
	});
});
