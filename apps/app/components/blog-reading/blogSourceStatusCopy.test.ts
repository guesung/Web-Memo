import { describe, expect, it } from "vitest";
import { getBlogSourceStatusCopy } from "./blogSourceStatusCopy";

describe("getBlogSourceStatusCopy", () => {
	it("수집 중에는 현재 개수만 말하고 총 글 수를 숨긴다", () => {
		const copy = getBlogSourceStatusCopy({
			blogName: "당근",
			viewState: "collecting",
			collectedCount: 124,
			total: null,
		});

		expect(copy.description).toBe(
			"현재 124개를 찾았어요. 전체 글 수는 확인 중이에요.",
		);
		expect(copy.description).not.toMatch(/총|%|\//);
	});

	it("전체 수집이 끝난 뒤에만 확정 총 글 수를 말한다", () => {
		expect(
			getBlogSourceStatusCopy({
				blogName: "토스",
				viewState: "complete",
				collectedCount: 393,
				total: 393,
			}).description,
		).toBe("공개된 글 총 393개를 모았어요.");
	});

	it("재개 요청 상태는 15분 확인 주기를 안내한다", () => {
		expect(
			getBlogSourceStatusCopy({
				blogName: "당근",
				viewState: "resumeQueued",
				collectedCount: 10,
				total: null,
			}).description,
		).toContain("15분마다");
	});
});
