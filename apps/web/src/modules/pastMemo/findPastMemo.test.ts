import { APITimeoutError } from "@typesafe-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IFRecentMemo } from "./getRecentMemos";

const mocks = vi.hoisted(() => ({
	getRecentMemos: vi.fn(),
	judgeWithJev: vi.fn(),
	reportPastMemoFailure: vi.fn(),
}));

vi.mock("./getRecentMemos", () => ({ getRecentMemos: mocks.getRecentMemos }));
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

const createMemo = (id: number, url: string): IFRecentMemo => ({
	id,
	title: `메모 ${id}`,
	url,
	favIconUrl: null,
	updated_at: null,
});

const callFindPastMemo = () =>
	findPastMemo({ accessToken: "token", userId: "user", page: PAGE });

beforeEach(() => {
	mocks.getRecentMemos.mockReset();
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
		mocks.getRecentMemos.mockResolvedValueOnce([
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

	it("URL이 정확히 같은 메모는 후보에서 빼고 jev에 넘긴다", async () => {
		const otherMemo = createMemo(2, "https://other.com");

		mocks.getRecentMemos.mockResolvedValueOnce([
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
		mocks.getRecentMemos.mockResolvedValueOnce([
			createMemo(1, "https://other.com"),
		]);

		const result = await callFindPastMemo();

		expect(result).toEqual({ duplicate: null, related: [] });
		expect(mocks.judgeWithJev).not.toHaveBeenCalled();
		expect(mocks.reportPastMemoFailure).not.toHaveBeenCalled();
	});

	it("메모 조회가 실패하면 빈 결과를 돌려주고 보고한다", async () => {
		const error = { message: "permission denied" };

		mocks.getRecentMemos.mockRejectedValueOnce(error);

		const result = await callFindPastMemo();

		expect(result).toEqual({ duplicate: null, related: [] });
		expect(mocks.reportPastMemoFailure).toHaveBeenCalledWith({
			error,
			stage: "fetch-memos",
		});
	});

	it("jev가 실패하면 빈 결과를 돌려주고 보고한다", async () => {
		const error = new Error("jev down");

		mocks.getRecentMemos.mockResolvedValueOnce([
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

		mocks.getRecentMemos.mockResolvedValueOnce([
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
