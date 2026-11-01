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

	describe("피드 소스", () => {
		const feedCopy = (
			viewState: Parameters<typeof getBlogSourceStatusCopy>[0]["viewState"],
		) =>
			getBlogSourceStatusCopy({
				blogName: "긱뉴스",
				viewState,
				collectedCount: 0,
				total: null,
				isFeed: true,
			});

		it("정상·수집 중에는 새 글을 모으고 있다고 말한다", () => {
			for (const viewState of [
				"complete",
				"refreshing",
				"collecting",
			] as const) {
				expect(feedCopy(viewState)).toEqual({
					title: "긱뉴스 · 새 글을 모으고 있어요",
					description:
						"하루 여러 번 최근 글을 확인해요. 이전 글은 가져오지 않아요.",
					hint: null,
				});
			}
		});

		it("글이 아직 없으면 수집을 기다린다고 말한다", () => {
			expect(feedCopy("waiting").title).toBe("긱뉴스 · 수집을 기다리고 있어요");
		});

		it("확인 실패 계열은 같은 문구이고 재개를 말하지 않는다", () => {
			for (const viewState of [
				"refreshFailed",
				"partialFailed",
				"resumeQueued",
			] as const) {
				expect(feedCopy(viewState)).toEqual({
					title: "긱뉴스 · 새 글을 확인하지 못했어요",
					description: "이전에 모은 글은 계속 볼 수 있어요.",
					hint: null,
				});
			}
		});
	});
});
