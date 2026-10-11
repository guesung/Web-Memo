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

const createOtherMemos = (count: number) =>
	Array.from({ length: count }, (_, index) =>
		createMemo(index + 1, `https://other.com/${index}`),
	);

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

	it("최근 200개에 일치가 없으면 URL 패턴으로 좁힌 오래된 메모에서 rule 일치를 찾는다", async () => {
		mocks.getMemoPage
			.mockResolvedValueOnce(createOtherMemos(200))
			.mockResolvedValueOnce([
				createMemo(401, "https://www.blog.com/post?utm_source=old"),
			]);

		const result = await callFindPastMemo();

		expect(result.duplicate).toEqual({
			id: 401,
			title: "메모 401",
			url: "https://www.blog.com/post?utm_source=old",
			source: "rule",
		});
		expect(mocks.getMemoPage).toHaveBeenCalledTimes(2);
		expect(mocks.getMemoPage).toHaveBeenNthCalledWith(2, {
			accessToken: "token",
			userId: "user",
			offset: 0,
			pageSize: 50,
			urlPattern: "%blog.com/post%",
		});
		expect(mocks.judgeWithJev).not.toHaveBeenCalled();
	});

	it("최근 메모가 200개 미만이면 전부 읽은 것이므로 좁힌 조회를 하지 않는다", async () => {
		const memos = createOtherMemos(199);
		mocks.getMemoPage.mockResolvedValueOnce(memos);
		const response = { duplicate: null, related: [] };
		mocks.judgeWithJev.mockResolvedValueOnce(response);

		expect(await callFindPastMemo()).toEqual(response);
		expect(mocks.getMemoPage).toHaveBeenCalledTimes(1);
		expect(mocks.getMemoPage).toHaveBeenCalledWith({
			accessToken: "token",
			userId: "user",
			offset: 0,
			pageSize: 200,
		});
		expect(mocks.judgeWithJev).toHaveBeenCalledWith({
			apiKey: "key",
			page: PAGE,
			memos,
		});
	});

	it("좁힌 조회에도 일치가 없으면 전체를 더 읽지 않고 최근 200개만 Jev에 보낸다", async () => {
		const memos = createOtherMemos(200);
		mocks.getMemoPage.mockResolvedValueOnce(memos).mockResolvedValueOnce([]);
		const response = { duplicate: null, related: [] };
		mocks.judgeWithJev.mockResolvedValueOnce(response);

		expect(await callFindPastMemo()).toEqual(response);
		expect(mocks.getMemoPage).toHaveBeenCalledTimes(2);
		expect(mocks.judgeWithJev).toHaveBeenCalledWith({
			apiKey: "key",
			page: PAGE,
			memos,
		});
	});

	it("좁힌 조회 실패도 빈 결과로 처리하고 Jev를 호출하지 않는다", async () => {
		const error = new Error("next page failed");
		mocks.getMemoPage
			.mockResolvedValueOnce(createOtherMemos(200))
			.mockRejectedValueOnce(error);

		expect(await callFindPastMemo()).toEqual({ duplicate: null, related: [] });
		expect(mocks.reportPastMemoFailure).toHaveBeenCalledWith({
			error,
			stage: "fetch-memos",
		});
		expect(mocks.judgeWithJev).not.toHaveBeenCalled();
	});

	it("좁힌 조회에서도 정확히 같은 URL은 제외하고 다른 URL의 규칙 일치를 찾는다", async () => {
		mocks.getMemoPage
			.mockResolvedValueOnce(createOtherMemos(200))
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
