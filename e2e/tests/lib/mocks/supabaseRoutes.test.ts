import { describe, expect, it } from "vitest";
import { createMockHighlight } from "./mockData";
import { sortHighlights } from "./supabaseRoutes";

const highlights = () => [
	createMockHighlight({ id: 3, created_at: "2026-01-01T00:00:00Z" }),
	createMockHighlight({ id: 1, created_at: "2026-01-02T00:00:00Z" }),
	createMockHighlight({ id: 2, created_at: "2026-01-01T00:00:00Z" }),
];

const sortedIds = (order?: string) => {
	const url = new URL("https://example.com/rest/v1/highlight");
	if (order) url.searchParams.set("order", order);
	return sortHighlights(highlights(), url).map(({ id }) => id);
};

describe("sortHighlights", () => {
	it("페이지별 일괄 조회에서 요청한 id 오름차순을 적용한다", () => {
		expect(sortedIds("id.asc")).toEqual([1, 2, 3]);
	});

	it("요청한 created_at 및 id 복합 정렬을 적용한다", () => {
		expect(sortedIds("created_at.desc,id.desc")).toEqual([1, 3, 2]);
	});

	it("정렬을 요청하지 않으면 기존 created_at 내림차순, id 내림차순을 유지한다", () => {
		expect(sortedIds()).toEqual([1, 3, 2]);
	});
});
