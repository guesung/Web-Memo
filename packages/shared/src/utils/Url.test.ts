import { describe, expect, it } from "vitest";

import { toLooseUrlKey } from "./Url";

describe("toLooseUrlKey", () => {
	const BASE_KEY = "example.com/post/1";

	it.each([
		"https://example.com/post/1",
		"https://www.example.com/post/1",
		"https://m.example.com/post/1",
		"https://example.com/post/1/",
		"https://example.com/post/1#section",
		"https://example.com/post/1?utm_source=x&utm_medium=y",
		"https://example.com/post/1?fbclid=abc",
		"https://example.com/post/1?gclid=abc",
		"https://example.com/post/1?ref=home",
		"https://example.com/post/1?si=share",
		"http://example.com/post/1",
	])("%s 를 같은 키로 만든다", (url) => {
		expect(toLooseUrlKey(url)).toBe(BASE_KEY);
	});

	it("추적 파라미터가 아닌 쿼리는 남기고 순서를 맞춘다", () => {
		expect(toLooseUrlKey("https://example.com/list?page=2&sort=new")).toBe(
			toLooseUrlKey("https://example.com/list?sort=new&page=2&utm_source=x"),
		);
		expect(toLooseUrlKey("https://example.com/list?page=2")).not.toBe(
			toLooseUrlKey("https://example.com/list?page=3"),
		);
	});

	it("youtu.be 단축 주소와 m.youtube.com을 youtube.com/watch 키로 맞춘다", () => {
		const expected = "youtube.com/watch?v=abc123";

		expect(toLooseUrlKey("https://youtu.be/abc123?si=xyz")).toBe(expected);
		expect(toLooseUrlKey("https://m.youtube.com/watch?v=abc123&t=30")).toBe(
			expected,
		);
		expect(toLooseUrlKey("https://www.youtube.com/watch?v=abc123")).toBe(
			expected,
		);
	});

	it("경로가 다르면 다른 키다", () => {
		expect(toLooseUrlKey("https://example.com/post/2")).not.toBe(BASE_KEY);
	});

	it("파싱할 수 없는 URL이면 null을 돌려준다", () => {
		expect(toLooseUrlKey("not a url")).toBeNull();
	});
});
