import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QUERY_KEY } from "../../constants/QueryKey";
import type { IFBlogReadingPage } from "../../types/blogReading";
import type { MemoSupabaseClient } from "../../types/supabaseCustom";
import { BlogReadingError } from "../../utils/supabase/blogReadingService";
import {
	blogReadingPageQueryOptions,
	shouldRetryBlogReadingQuery,
} from "./useBlogReadingPageQuery";
import { blogReadingSummaryQueryOptions } from "./useBlogReadingSummaryQuery";

const { getBlogReadingPage } = vi.hoisted(() => ({
	getBlogReadingPage: vi.fn(),
}));

vi.mock("../../utils/supabase/blogReadingService", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("../../utils/supabase/blogReadingService")
	>()),
	getBlogReadingPage,
	getBlogReadingSummary: vi.fn().mockResolvedValue({
		sources: [],
		nextCheckAt: "2026-09-30T10:15:00+00:00",
	}),
}));

const OLD_VERSION = "2026-09-30T00:00:00+00:00";
const NEW_VERSION = "2026-09-30T09:00:00+00:00";
const CURSOR = { blogId: "toss" as const, providerId: "30", publishedAt: null };

const createPage = (
	overrides: Partial<IFBlogReadingPage> = {},
): IFBlogReadingPage => ({
	items: [],
	nextCursor: null,
	catalogVersion: OLD_VERSION,
	newArticleCount: 0,
	sources: [],
	...overrides,
});

describe("블로그 정주행 목록 스냅샷", () => {
	let queryClient: QueryClient;
	let observer: InfiniteQueryObserver<IFBlogReadingPage>;
	let unsubscribe: () => void;

	beforeEach(async () => {
		vi.clearAllMocks();
		queryClient = new QueryClient();
		const options = blogReadingPageQueryOptions({
			queryClient,
			supabaseClient: {} as MemoSupabaseClient,
			userId: "user-1",
			blogId: null,
			sort: "oldest",
		});
		observer = new InfiniteQueryObserver(
			queryClient,
			options as unknown as ConstructorParameters<
				typeof InfiniteQueryObserver<IFBlogReadingPage>
			>[1],
		);
		getBlogReadingPage.mockImplementation(async (params) =>
			createPage({
				catalogVersion: params.catalogVersion ?? NEW_VERSION,
				nextCursor: params.cursor ? null : CURSOR,
			}),
		);
		// 첫 조회는 옛 시점(OLD_VERSION)을 고정한 것으로 둔다. 이후 시점 없이 부르면 새 시점이 온다.
		getBlogReadingPage.mockResolvedValueOnce(
			createPage({ nextCursor: CURSOR }),
		);
		unsubscribe = observer.subscribe(() => {});
		await vi.waitFor(() => {
			expect(observer.getCurrentResult().status).toBe("success");
		});
	});

	afterEach(() => {
		unsubscribe();
		queryClient.clear();
	});

	it("다음 페이지는 첫 페이지의 카탈로그 시점과 커서를 넘긴다", async () => {
		await observer.fetchNextPage();

		expect(getBlogReadingPage.mock.calls.map((call) => call[0])).toEqual([
			expect.objectContaining({ cursor: null, catalogVersion: null }),
			expect.objectContaining({ cursor: CURSOR, catalogVersion: OLD_VERSION }),
		]);
	});

	it("메모 변경 무효화로 재조회해도 첫 페이지까지 같은 시점을 유지한다", async () => {
		await observer.fetchNextPage();
		getBlogReadingPage.mockClear();

		await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });

		expect(getBlogReadingPage.mock.calls.map((call) => call[0])).toEqual([
			expect.objectContaining({ cursor: null, catalogVersion: OLD_VERSION }),
			expect.objectContaining({ cursor: CURSOR, catalogVersion: OLD_VERSION }),
		]);
		expect(observer.getCurrentResult().data?.pages).toHaveLength(2);
	});

	it("목록 갱신(reset)은 스냅샷을 버리고 새 시점으로 첫 페이지부터 읽는다", async () => {
		await observer.fetchNextPage();
		getBlogReadingPage.mockClear();

		await queryClient.resetQueries({
			queryKey: QUERY_KEY.blogReadingPages("user-1"),
		});

		expect(getBlogReadingPage.mock.calls.map((call) => call[0])).toEqual([
			expect.objectContaining({ cursor: null, catalogVersion: null }),
		]);
		expect(observer.getCurrentResult().data?.pages).toEqual([
			createPage({ catalogVersion: NEW_VERSION, nextCursor: CURSOR }),
		]);
	});
});

describe("블로그 정주행 캐시 키", () => {
	it("목록·요약은 계정별이며 memos 접두사 무효화에 함께 걸린다", async () => {
		const queryClient = new QueryClient();
		const pageKey = QUERY_KEY.blogReadingPage("user-1", {
			blogId: "toss",
			sort: "newest",
		});
		const summaryKey = blogReadingSummaryQueryOptions({
			supabaseClient: {} as MemoSupabaseClient,
			userId: "user-1",
		}).queryKey;
		queryClient.setQueryData(pageKey, { pages: [], pageParams: [] });
		queryClient.setQueryData(summaryKey, { sources: [], nextCheckAt: "" });

		expect(pageKey.slice(0, 3)).toEqual(["memos", "blogCompletion", "user-1"]);
		expect(summaryKey).toEqual(QUERY_KEY.blogReadingSummary("user-1"));

		await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });

		expect(queryClient.getQueryState(pageKey)?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(summaryKey)?.isInvalidated).toBe(true);
		queryClient.clear();
	});
});

describe("조회 재시도", () => {
	const createError = (code: BlogReadingError["code"]) =>
		new BlogReadingError({ code, reason: null, message: "" });

	it("로그인 필요·잘못된 요청·구독 필요는 다시 시도하지 않는다", () => {
		expect(shouldRetryBlogReadingQuery(0, createError("unauthenticated"))).toBe(
			false,
		);
		expect(shouldRetryBlogReadingQuery(0, createError("invalid_request"))).toBe(
			false,
		);
		expect(
			shouldRetryBlogReadingQuery(0, createError("subscription_required")),
		).toBe(false);
	});

	it("네트워크 오류는 2번까지 다시 시도한다", () => {
		expect(shouldRetryBlogReadingQuery(1, createError("network"))).toBe(true);
		expect(shouldRetryBlogReadingQuery(2, createError("network"))).toBe(false);
	});
});
