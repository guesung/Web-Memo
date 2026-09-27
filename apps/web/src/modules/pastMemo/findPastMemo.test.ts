import { APITimeoutError } from "@typesafe-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IFMemoCandidate } from "./getMemoPage";

const mocks = vi.hoisted(() => ({
	getMemoPage: vi.fn(),
	judgeWithJev: vi.fn(),
	reportPastMemoFailure: vi.fn(),
}));

vi.mock("./getMemoPage", () => ({ getMemoPage: mocks.getMemoPage }));
vi.mock("./judgeWithJev", () => ({ judgeWithJev: mocks.judgeWithJev }));
vi.mock("./reportPastMemoFailure", () => ({
	reportPastMemoFailure: mocks.reportPastMemoFailure,
}));

const { findPastMemo } = await import("./findPastMemo");

const PAGE = {
	pageUrl: "https://blog.com/post",
	pageTitle: "현재 글",
	pageExcerpt: "본문",
};

const createMemo = (id: number, url: string): IFMemoCandidate => ({
	id,
	title: `메모 ${id}`,
	url,
	favIconUrl: null,
	updated_at: null,
});

const callFindPastMemo = () =>
	findPastMemo({ accessToken: "token", userId: "user", page: PAGE });

beforeEach(() => {
	mocks.getMemoPage.mockReset();
	mocks.judgeWithJev.mockReset();
	mocks.reportPastMemoFailure.mockReset();
	vi.spyOn(console, "warn").mockImplementation(() => {});
	vi.stubEnv("TYPESAFE_API_KEY", "key");
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe("findPastMemo", () => {
	it("느슨한 URL이 같은 메모가 있으면 jev 없이 rule 중복을 돌려준다", async () => {
		mocks.getMemoPage.mockResolvedValueOnce([
			createMemo(1, "https://other.com"),
			createMemo(2, "https://www.blog.com/post?utm_source=x"),
		]);

		const result = await callFindPastMemo();

		expect(result).toEqual({
			duplicate: {
				id: 2,
				title: "메모 2",
				url: "https://www.blog.com/post?utm_source=x",
				source: "rule",
			},
			related: [],
		});
		expect(mocks.judgeWithJev).not.toHaveBeenCalled();
	});

	it.each([200, 201, 400, 401])(
		"%i번째의 오래된 URL 일치도 rule로 반환하고 이후 조회를 중단한다",
		async (position) => {
			const memos = Array.from({ length: position }, (_, index) =>
				createMemo(index + 1, `https://other.com/${index}`),
			);
			memos[position - 1] = createMemo(
				position,
				"https://www.blog.com/post?utm_source=old",
			);
			for (let offset = 0; offset < memos.length; offset += 200) {
				mocks.getMemoPage.mockResolvedValueOnce(
					memos.slice(offset, offset + 200),
				);
			}

			const result = await callFindPastMemo();

			expect(result.duplicate).toEqual({
				id: position,
				title: `메모 ${position}`,
				url: "https://www.blog.com/post?utm_source=old",
				source: "rule",
			});
			expect(mocks.getMemoPage).toHaveBeenCalledTimes(
				Math.ceil(position / 200),
			);
			expect(mocks.judgeWithJev).not.toHaveBeenCalled();
		},
	);

	it.each([0, 199, 200, 201, 400])(
		"일치 없는 %i개를 끝까지 검사하고 Jev에는 최근 200개만 보낸다",
		async (count) => {
			const memos = Array.from({ length: count }, (_, index) =>
				createMemo(index + 1, `https://other.com/${index}`),
			);
			for (let offset = 0; offset <= memos.length; offset += 200) {
				mocks.getMemoPage.mockResolvedValueOnce(
					memos.slice(offset, offset + 200),
				);
			}
			const response = { duplicate: null, related: [] };
			mocks.judgeWithJev.mockResolvedValueOnce(response);

			expect(await callFindPastMemo()).toEqual(response);
			expect(mocks.getMemoPage).toHaveBeenCalledTimes(
				Math.floor(count / 200) + 1,
			);
			for (
				let index = 0;
				index < mocks.getMemoPage.mock.calls.length;
				index += 1
			) {
				expect(mocks.getMemoPage).toHaveBeenNthCalledWith(index + 1, {
					accessToken: "token",
					userId: "user",
					offset: index * 200,
					pageSize: 200,
				});
			}
			expect(mocks.judgeWithJev).toHaveBeenCalledWith({
				apiKey: "key",
				page: PAGE,
				memos: memos.slice(0, 200),
			});
		},
	);

	it("후속 페이지 조회 실패도 빈 결과로 처리하고 Jev를 호출하지 않는다", async () => {
		const error = new Error("next page failed");
		mocks.getMemoPage
			.mockResolvedValueOnce(
				Array.from({ length: 200 }, (_, index) =>
					createMemo(index, `https://other.com/${index}`),
				),
			)
			.mockRejectedValueOnce(error);

		expect(await callFindPastMemo()).toEqual({ duplicate: null, related: [] });
		expect(mocks.reportPastMemoFailure).toHaveBeenCalledWith({
			error,
			stage: "fetch-memos",
		});
		expect(mocks.judgeWithJev).not.toHaveBeenCalled();
	});

	it("후속 페이지에서도 정확히 같은 URL은 제외하고 다른 URL의 규칙 일치를 찾는다", async () => {
		mocks.getMemoPage
			.mockResolvedValueOnce(
				Array.from({ length: 200 }, (_, index) =>
					createMemo(index, `https://other.com/${index}`),
				),
			)
			.mockResolvedValueOnce([
				createMemo(201, PAGE.pageUrl),
				createMemo(202, "https://www.blog.com/post"),
			]);
		vi.stubEnv("TYPESAFE_API_KEY", "");

		const result = await callFindPastMemo();

		expect(result.duplicate?.id).toBe(202);
		expect(result.duplicate?.source).toBe("rule");
		expect(mocks.judgeWithJev).not.toHaveBeenCalled();
	});

	it("URL이 정확히 같은 메모는 후보에서 빼고 jev에 넘긴다", async () => {
		const otherMemo = createMemo(2, "https://other.com");

		mocks.getMemoPage.mockResolvedValueOnce([
			createMemo(1, "https://blog.com/post"),
			otherMemo,
		]);
		mocks.judgeWithJev.mockResolvedValueOnce({ duplicate: null, related: [] });

		await callFindPastMemo();

		expect(mocks.judgeWithJev).toHaveBeenCalledWith({
			apiKey: "key",
			page: PAGE,
			memos: [otherMemo],
		});
	});

	it("TYPESAFE_API_KEY가 없으면 jev를 부르지 않고 Sentry 없이 빈 결과다", async () => {
		vi.stubEnv("TYPESAFE_API_KEY", "");
		mocks.getMemoPage.mockResolvedValueOnce([
			createMemo(1, "https://other.com"),
		]);

		const result = await callFindPastMemo();

		expect(result).toEqual({ duplicate: null, related: [] });
		expect(mocks.judgeWithJev).not.toHaveBeenCalled();
		expect(mocks.reportPastMemoFailure).not.toHaveBeenCalled();
	});

	it("메모 조회가 실패하면 빈 결과를 돌려주고 보고한다", async () => {
		const error = { message: "permission denied" };

		mocks.getMemoPage.mockRejectedValueOnce(error);

		const result = await callFindPastMemo();

		expect(result).toEqual({ duplicate: null, related: [] });
		expect(mocks.reportPastMemoFailure).toHaveBeenCalledWith({
			error,
			stage: "fetch-memos",
		});
	});

	it("jev가 실패하면 빈 결과를 돌려주고 보고한다", async () => {
		const error = new Error("jev down");

		mocks.getMemoPage.mockResolvedValueOnce([
			createMemo(1, "https://other.com"),
		]);
		mocks.judgeWithJev.mockRejectedValueOnce(error);

		const result = await callFindPastMemo();

		expect(result).toEqual({ duplicate: null, related: [] });
		expect(mocks.reportPastMemoFailure).toHaveBeenCalledWith({
			error,
			stage: "jev",
		});
	});

	it("jev 타임아웃은 경고로 보고한다", async () => {
		const error = new APITimeoutError(2500);

		mocks.getMemoPage.mockResolvedValueOnce([
			createMemo(1, "https://other.com"),
		]);
		mocks.judgeWithJev.mockRejectedValueOnce(error);

		const result = await callFindPastMemo();

		expect(result).toEqual({ duplicate: null, related: [] });
		expect(mocks.reportPastMemoFailure).toHaveBeenCalledWith({
			error,
			stage: "jev-timeout",
			level: "warning",
		});
	});
});
