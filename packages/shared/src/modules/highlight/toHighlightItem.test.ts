import { describe, expect, it } from "vitest";
import type { HighlightRow } from "../../types";
import { toHighlightItem } from "./toHighlightItem";

function createRow(overrides: Partial<HighlightRow> = {}): HighlightRow {
	return {
		id: 1,
		user_id: "user-1",
		url: "https://example.com",
		title: "제목",
		favIconUrl: null,
		exact_text: "브라보",
		prefix_text: "알파 ",
		suffix_text: " 찰리",
		text_position_start: 3,
		color: "yellow",
		note: null,
		created_at: "2026-08-16T00:00:00Z",
		updated_at: "2026-08-16T00:00:00Z",
		...overrides,
	} as HighlightRow;
}

describe("toHighlightItem", () => {
	it("행을 렌더러가 쓰는 형태로 바꾼다", () => {
		expect(toHighlightItem(createRow())).toEqual({
			id: 1,
			anchor: {
				exact: "브라보",
				prefix: "알파 ",
				suffix: " 찰리",
				textPositionStart: 3,
			},
			color: "yellow",
		});
	});

	it("prefix가 null이면 빈 문자열로 채운다", () => {
		const item = toHighlightItem(createRow({ prefix_text: null }));

		expect(item.anchor.prefix).toBe("");
	});

	it("suffix가 null이면 빈 문자열로 채운다", () => {
		const item = toHighlightItem(createRow({ suffix_text: null }));

		expect(item.anchor.suffix).toBe("");
	});

	it("text_position_start가 null이면 0으로 채운다", () => {
		const item = toHighlightItem(createRow({ text_position_start: null }));

		expect(item.anchor.textPositionStart).toBe(0);
	});
});
