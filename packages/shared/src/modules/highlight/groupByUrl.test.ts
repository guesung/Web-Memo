import { describe, expect, it } from "vitest";
import { groupHighlightsByUrl } from "./groupByUrl";

const row = (overrides: Record<string, unknown>) =>
	({
		id: 1,
		url: "https://a.com",
		title: "제목",
		favIconUrl: null,
		exact_text: "문장",
		prefix_text: null,
		suffix_text: null,
		text_position_start: 0,
		color: "yellow",
		note: null,
		user_id: "u",
		created_at: "2026-08-15T00:00:00Z",
		updated_at: "2026-08-15T00:00:00Z",
		...overrides,
	}) as never;

describe("groupHighlightsByUrl", () => {
	it("같은 URL의 하이라이트를 하나로 묶는다", () => {
		const groups = groupHighlightsByUrl([
			row({ id: 1, url: "https://a.com" }),
			row({ id: 2, url: "https://a.com" }),
			row({ id: 3, url: "https://b.com" }),
		]);

		expect(groups).toHaveLength(2);
		expect(groups[0].highlights).toHaveLength(2);
	});

	it("입력 순서를 그룹 순서로 유지한다", () => {
		const groups = groupHighlightsByUrl([
			row({ id: 1, url: "https://b.com" }),
			row({ id: 2, url: "https://a.com" }),
		]);

		expect(groups.map((group) => group.url)).toEqual([
			"https://b.com",
			"https://a.com",
		]);
	});

	it("그룹의 제목과 파비콘은 첫 하이라이트 것을 쓴다", () => {
		const groups = groupHighlightsByUrl([
			row({ id: 1, title: "첫 제목", favIconUrl: "https://a.com/f.ico" }),
			row({ id: 2, title: "나중 제목" }),
		]);

		expect(groups[0].title).toBe("첫 제목");
		expect(groups[0].favIconUrl).toBe("https://a.com/f.ico");
	});

	it("빈 배열은 빈 그룹을 반환한다", () => {
		expect(groupHighlightsByUrl([])).toEqual([]);
	});
});
