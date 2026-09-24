import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IFRecentMemo } from "./getRecentMemos";

const mocks = vi.hoisted(() => ({
	systemOne: vi.fn(),
	clientConfig: vi.fn(),
}));

vi.mock("@typesafe-ai/sdk", async (importOriginal) => {
	const original = await importOriginal<typeof import("@typesafe-ai/sdk")>();

	return {
		...original,
		TypeSafeClient: class {
			systemOne = mocks.systemOne;

			constructor(config: unknown) {
				mocks.clientConfig(config);
			}
		},
	};
});

const { judgeWithJev } = await import("./judgeWithJev");

const PAGE = {
	pageUrl: "https://blog.com/post",
	pageTitle: "현재 글",
	pageExcerpt: "본문",
};

const createMemos = (count: number): IFRecentMemo[] =>
	Array.from({ length: count }, (_, index) => ({
		id: 100 + index,
		title: `메모 ${index}`,
		url: `https://site.com/${index}`,
		favIconUrl: null,
		updated_at: `2026-09-${String(20 - index).padStart(2, "0")}`,
	}));

const shortlistAnswer = (probabilities: Record<string, number>) => ({
	answers: {
		closest: { type: "choice", choice: "none", confidence: 0.5, probabilities },
	},
});

const noulAnswer = (noul: number) => ({ type: "noul", noul });

const scoreAnswer = (score: number, confidence: number) => ({
	type: "score",
	score,
	confidence,
	probabilities: {},
});

beforeEach(() => {
	mocks.systemOne.mockReset();
	mocks.clientConfig.mockReset();
});

describe("judgeWithJev", () => {
	it("후보가 없으면 jev를 부르지 않는다", async () => {
		const result = await judgeWithJev({ apiKey: "key", page: PAGE, memos: [] });

		expect(result).toEqual({ duplicate: null, related: [] });
		expect(mocks.systemOne).not.toHaveBeenCalled();
	});

	it("타임아웃 2.5초·재시도 없음으로 클라이언트를 만들고 후보를 로컬 라벨로 보낸다", async () => {
		mocks.systemOne.mockResolvedValueOnce(shortlistAnswer({ none: 1 }));

		await judgeWithJev({ apiKey: "key", page: PAGE, memos: createMemos(2) });

		expect(mocks.clientConfig).toHaveBeenCalledWith({
			apiKey: "key",
			timeout: 2500,
			retry: { maxRetries: 0 },
		});

		const criteria =
			mocks.systemOne.mock.calls[0][0].questions.closest.criteria;

		expect(Object.keys(criteria)).toEqual(["none", "P0", "P1"]);
		expect(criteria.P0).toBe("메모 0 — https://site.com/0");
		expect(JSON.stringify(criteria)).not.toContain("100");
	});

	it("1단계에서 none을 빼고 확률 0.02 이상인 상위 5개만 2단계로 넘긴다", async () => {
		mocks.systemOne
			.mockResolvedValueOnce(
				shortlistAnswer({
					none: 0.5,
					P0: 0.01,
					P1: 0.1,
					P2: 0.2,
					P3: 0.03,
					P4: 0.05,
					P5: 0.04,
					P6: 0.02,
				}),
			)
			.mockResolvedValueOnce({ answers: {} });

		await judgeWithJev({ apiKey: "key", page: PAGE, memos: createMemos(7) });

		const detailQuestionNames = Object.keys(
			mocks.systemOne.mock.calls[1][0].questions,
		);

		expect(detailQuestionNames).toEqual([
			"same_P2",
			"related_P2",
			"same_P1",
			"related_P1",
			"same_P4",
			"related_P4",
			"same_P5",
			"related_P5",
			"same_P3",
			"related_P3",
		]);
	});

	it("1단계에서 남는 후보가 없으면 2단계를 부르지 않는다", async () => {
		mocks.systemOne.mockResolvedValueOnce(
			shortlistAnswer({ none: 0.99, P0: 0.01 }),
		);

		const result = await judgeWithJev({
			apiKey: "key",
			page: PAGE,
			memos: createMemos(1),
		});

		expect(result).toEqual({ duplicate: null, related: [] });
		expect(mocks.systemOne).toHaveBeenCalledTimes(1);
	});

	it("noul 0.85 이상 중 가장 높은 하나를 중복으로 고르고 관련에서 뺀다", async () => {
		mocks.systemOne
			.mockResolvedValueOnce(shortlistAnswer({ P0: 0.4, P1: 0.3, P2: 0.2 }))
			.mockResolvedValueOnce({
				answers: {
					same_P0: noulAnswer(0.86),
					related_P0: scoreAnswer(3, 0.9),
					same_P1: noulAnswer(0.95),
					related_P1: scoreAnswer(3, 0.9),
					same_P2: noulAnswer(0.84),
					related_P2: scoreAnswer(2.5, 0.8),
				},
			});

		const result = await judgeWithJev({
			apiKey: "key",
			page: PAGE,
			memos: createMemos(3),
		});

		expect(result.duplicate).toEqual({
			id: 101,
			title: "메모 1",
			url: "https://site.com/1",
			source: "jev",
		});
		expect(result.related.map((memo) => memo.id)).toEqual([100, 102]);
	});

	it("관련은 score 2 이상·confidence 0.7 이상만, 점수 높은 순으로 최대 3개다", async () => {
		mocks.systemOne
			.mockResolvedValueOnce(
				shortlistAnswer({ P0: 0.3, P1: 0.2, P2: 0.2, P3: 0.1, P4: 0.1 }),
			)
			.mockResolvedValueOnce({
				answers: {
					same_P0: noulAnswer(0.1),
					related_P0: scoreAnswer(2.1, 0.9),
					same_P1: noulAnswer(0.1),
					related_P1: scoreAnswer(2.9, 0.8),
					same_P2: noulAnswer(0.1),
					related_P2: scoreAnswer(1.9, 0.99),
					same_P3: noulAnswer(0.1),
					related_P3: scoreAnswer(3, 0.69),
					same_P4: noulAnswer(0.1),
					related_P4: scoreAnswer(2.5, 0.7),
				},
			});

		const result = await judgeWithJev({
			apiKey: "key",
			page: PAGE,
			memos: createMemos(5),
		});

		expect(result.duplicate).toBe(null);
		expect(result.related).toEqual([
			{
				id: 101,
				title: "메모 1",
				url: "https://site.com/1",
				favIconUrl: null,
				updatedAt: "2026-09-19",
			},
			expect.objectContaining({ id: 104 }),
			expect.objectContaining({ id: 100 }),
		]);
	});

	it("관련 후보가 3개를 넘으면 점수 높은 3개만 남긴다", async () => {
		mocks.systemOne
			.mockResolvedValueOnce(
				shortlistAnswer({ P0: 0.3, P1: 0.2, P2: 0.2, P3: 0.1 }),
			)
			.mockResolvedValueOnce({
				answers: {
					related_P0: scoreAnswer(2, 0.9),
					related_P1: scoreAnswer(2.2, 0.9),
					related_P2: scoreAnswer(2.8, 0.9),
					related_P3: scoreAnswer(2.5, 0.9),
				},
			});

		const result = await judgeWithJev({
			apiKey: "key",
			page: PAGE,
			memos: createMemos(4),
		});

		expect(result.related.map((memo) => memo.id)).toEqual([102, 103, 101]);
	});

	it("jev 호출이 실패하면 오류를 그대로 던진다", async () => {
		mocks.systemOne.mockRejectedValueOnce(new Error("jev down"));

		await expect(
			judgeWithJev({ apiKey: "key", page: PAGE, memos: createMemos(1) }),
		).rejects.toThrow("jev down");
	});
});
