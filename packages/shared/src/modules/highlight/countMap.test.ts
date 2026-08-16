import { describe, expect, it } from "vitest";
import { toHighlightCountMap } from "./countMap";

describe("toHighlightCountMap", () => {
	it("행을 url → count 맵으로 바꾼다", () => {
		const map = toHighlightCountMap([
			{ url: "https://a.com", count: 3 },
			{ url: "https://b.com", count: 1 },
		]);

		expect(map.get("https://a.com")).toBe(3);
		expect(map.get("https://b.com")).toBe(1);
	});

	it("없는 url은 undefined를 반환한다", () => {
		const map = toHighlightCountMap([{ url: "https://a.com", count: 3 }]);

		expect(map.get("https://none.com")).toBeUndefined();
	});

	it("빈 배열은 빈 맵을 만든다", () => {
		expect(toHighlightCountMap([]).size).toBe(0);
	});

	it("같은 url이 중복되면 마지막 값을 쓴다", () => {
		const map = toHighlightCountMap([
			{ url: "https://a.com", count: 1 },
			{ url: "https://a.com", count: 5 },
		]);

		expect(map.get("https://a.com")).toBe(5);
	});
});
