import { describe, expect, it, vi } from "vitest";
import { resolveViewChangeParams } from ".";

vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn() },
}));

describe("view_change 메모 보기 방식", () => {
	it("메모 목록에서 view 쿼리를 grid/list/domain으로 분류한다", () => {
		for (const [query, layout] of [
			["", "grid"],
			["view=list", "list"],
			["view=domain", "domain"],
			["view=unexpected", "grid"],
		]) {
			expect(
				resolveViewChangeParams("/en/memos", new URLSearchParams(query)),
			).toEqual({
				view: "all",
				layout,
			});
		}
	});

	it("목록의 기존 view 분류와 경로별 layout을 함께 기록한다", () => {
		expect(
			resolveViewChangeParams(
				"/en/memos/wish",
				new URLSearchParams("isWish=true&view=domain"),
			),
		).toEqual({ view: "wish", layout: "domain" });
		expect(
			resolveViewChangeParams(
				"/en/memos/star",
				new URLSearchParams("category=Work&view=list"),
			),
		).toEqual({ view: "category", layout: "list" });
		expect(
			resolveViewChangeParams(
				"/en/memos/reading",
				new URLSearchParams("view=domain"),
			),
		).toEqual({ view: "all", layout: "domain" });
	});

	it("목록 외 경로에는 layout을 붙이지 않는다", () => {
		for (const path of [
			"/en/memos/setting",
			"/en/memos/trash",
			"/en/highlights",
			"/en/blog-reading",
		]) {
			expect(
				resolveViewChangeParams(path, new URLSearchParams("view=domain")),
			).not.toHaveProperty("layout");
		}
	});
});
