import { describe, expect, it } from "vitest";
import { getHighlightSourceUrl } from "./highlightSourceUrl";

describe("getHighlightSourceUrl", () => {
	it("기존 쿼리와 요소 anchor를 유지하고 지시자 예약 문자를 인코딩한다", () => {
		const result = getHighlightSourceUrl({
			url: "https://example.com/a?q=1#section",
			exact_text: "a-b, c",
			prefix_text: "앞-말",
			suffix_text: "뒤",
		});
		expect(result).toBe(
			"https://example.com/a?q=1#section:~:text=%EC%95%9E%2D%EB%A7%90-,a%2Db%2C%20c,-%EB%92%A4",
		);
	});
	it("여러 블록 인용을 시작과 끝으로 지정하고 오래된 지시자는 교체한다", () => {
		expect(
			getHighlightSourceUrl({
				url: "https://example.com/#a:~:text=old",
				exact_text: "first\nsecond\nlast",
			}),
		).toBe("https://example.com/#a:~:text=first,last");
	});
	it("유효하지 않거나 실행 가능한 URL은 링크로 사용하지 않는다", () => {
		expect(
			getHighlightSourceUrl({ url: "javascript:alert(1)", exact_text: "text" }),
		).toBe("#");
		expect(getHighlightSourceUrl({ url: "invalid", exact_text: "text" })).toBe(
			"#",
		);
	});
});
