import { describe, expect, it } from "vitest";
import { getBlogSummaryText, getBlogSummaryTotals } from "./blogReadingSummary";

const toss = {
	blogId: "toss",
	collectedCount: 393,
	completedCount: 32,
	total: 393,
} as const;
const daangn = {
	blogId: "daangn",
	collectedCount: 220,
	completedCount: 18,
	total: 220,
} as const;
const geeknews = {
	blogId: "geeknews",
	collectedCount: 12,
	completedCount: 5,
	total: null,
} as const;

describe("getBlogSummaryTotals", () => {
	it("모든 소스의 총 글 수가 확정되면 합계를 돌려준다", () => {
		expect(getBlogSummaryTotals([toss, daangn])).toMatchObject({
			collectedCount: 613,
			completedCount: 50,
			confirmedTotal: 613,
			feed: null,
		});
	});

	it("수집 중인 소스가 있으면 총 글 수를 추정하지 않는다", () => {
		expect(
			getBlogSummaryTotals([
				toss,
				{ ...daangn, collectedCount: 124, total: null },
			]).confirmedTotal,
		).toBeNull();
	});

	it("구독이 없으면 총 글 수가 없다", () => {
		expect(getBlogSummaryTotals([]).confirmedTotal).toBeNull();
	});

	it("피드 소스는 확정 총 글 수 계산에서 빠지고 안 읽은 글로 따로 합친다", () => {
		expect(getBlogSummaryTotals([toss, daangn, geeknews])).toEqual({
			collectedCount: 613,
			completedCount: 50,
			confirmedTotal: 613,
			hasArchiveSource: true,
			feed: { collectedCount: 12, unreadCount: 7 },
		});
	});
});

describe("getBlogSummaryText", () => {
	it("토스·당근만 보면 기존 요약 그대로다", () => {
		expect(getBlogSummaryText([toss, daangn])).toEqual({
			summaryText: "전체 글 613개 · 메모할 글 563개 · 메모 완료 50개",
			allMemoedText: null,
		});
	});

	it("전체 필터에서는 긱뉴스 안 읽은 글을 뒤에 덧붙이고, 구독 중 0개면 0개로 보인다", () => {
		expect(getBlogSummaryText([toss, geeknews]).summaryText).toBe(
			"전체 글 393개 · 메모할 글 361개 · 메모 완료 32개 · 긱뉴스 안 읽은 글 7개",
		);
		expect(
			getBlogSummaryText([
				toss,
				{ ...geeknews, collectedCount: 0, completedCount: 0 },
			]).summaryText,
		).toContain("긱뉴스 안 읽은 글 0개");
	});

	it("긱뉴스만 보면 안 읽은 글 수만 말한다", () => {
		expect(getBlogSummaryText([geeknews])).toEqual({
			summaryText: "안 읽은 글 7개",
			allMemoedText: null,
		});
	});

	it("긱뉴스 글에 모두 메모했으면 안내 줄을 준다", () => {
		expect(getBlogSummaryText([{ ...geeknews, completedCount: 12 }])).toEqual({
			summaryText: "안 읽은 글 0개",
			allMemoedText: "모은 글에는 모두 메모를 남겼어요.",
		});
		expect(
			getBlogSummaryText([
				{ ...geeknews, collectedCount: 0, completedCount: 0 },
			]).allMemoedText,
		).toBeNull();
	});
});
