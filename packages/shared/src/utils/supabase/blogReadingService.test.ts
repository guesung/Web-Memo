import { describe, expect, it, vi } from "vitest";
import type { MemoSupabaseClient } from "../../types";
import {
	BlogReadingError,
	getBlogReadingPage,
	getBlogReadingSummary,
	requestBlogSync,
	setBlogSubscription,
	toBlogReadingError,
} from "./blogReadingService";

const createClient = (response: { data: unknown; error: unknown }) => {
	const rpc = vi.fn().mockResolvedValue(response);
	const schema = vi.fn().mockReturnValue({ rpc });

	return {
		rpc,
		schema,
		supabaseClient: { schema } as unknown as MemoSupabaseClient,
	};
};

const PAGE = {
	items: [],
	nextCursor: null,
	catalogVersion: "2026-09-30T00:00:00+00:00",
	newArticleCount: 0,
	sources: [],
};

describe("블로그 정주행 RPC 호출", () => {
	it("페이지 조회는 memo 스키마에 기본값(과거순·30개·커서 없음)을 넘긴다", async () => {
		const { rpc, schema, supabaseClient } = createClient({
			data: PAGE,
			error: null,
		});

		expect(await getBlogReadingPage({ supabaseClient })).toEqual(PAGE);
		expect(schema).toHaveBeenCalledWith("memo");
		expect(rpc).toHaveBeenCalledWith("get_blog_reading_page", {
			p_blog_id: null,
			p_sort: "oldest",
			p_page_size: 30,
			p_cursor: null,
			p_catalog_version: null,
		});
	});

	it("페이지 조회는 커서와 카탈로그 시점을 그대로 넘긴다", async () => {
		const { rpc, supabaseClient } = createClient({ data: PAGE, error: null });
		const cursor = {
			blogId: "toss" as const,
			providerId: "10",
			publishedAt: "2021-04-28T00:00:00+00:00",
		};

		await getBlogReadingPage({
			supabaseClient,
			blogId: "toss",
			sort: "newest",
			cursor,
			catalogVersion: PAGE.catalogVersion,
		});

		expect(rpc).toHaveBeenCalledWith("get_blog_reading_page", {
			p_blog_id: "toss",
			p_sort: "newest",
			p_page_size: 30,
			p_cursor: cursor,
			p_catalog_version: PAGE.catalogVersion,
		});
	});

	it("요약·구독·재개 요청은 계약된 RPC 이름과 인자를 쓴다", async () => {
		const { rpc, supabaseClient } = createClient({ data: {}, error: null });

		await getBlogReadingSummary({ supabaseClient });
		await setBlogSubscription({
			supabaseClient,
			blogId: "daangn",
			active: false,
		});
		await requestBlogSync({ supabaseClient, blogId: "daangn" });

		expect(rpc.mock.calls).toEqual([
			["get_blog_reading_summary", undefined],
			["set_blog_subscription", { p_blog_id: "daangn", p_active: false }],
			["request_blog_sync", { p_blog_id: "daangn" }],
		]);
	});

	it("RPC 오류는 사용자 친화 오류로 던진다", async () => {
		const { supabaseClient } = createClient({
			data: null,
			error: { code: "22023", message: "invalid_cursor" },
		});

		await expect(getBlogReadingPage({ supabaseClient })).rejects.toMatchObject({
			name: "BlogReadingError",
			code: "invalid_request",
			reason: "invalid_cursor",
		});
	});

	it("빈 응답은 알 수 없는 오류다", async () => {
		const { supabaseClient } = createClient({ data: null, error: null });

		await expect(
			getBlogReadingSummary({ supabaseClient }),
		).rejects.toBeInstanceOf(BlogReadingError);
	});
});

describe("오류 코드 변환", () => {
	it.each([
		[{ code: "PT401", message: "unauthenticated" }, "unauthenticated"],
		[{ code: "PGRST301", message: "JWT expired" }, "unauthenticated"],
		[
			{
				code: "42501",
				message: "permission denied for function get_blog_reading_page",
			},
			"unauthenticated",
		],
		[
			{ code: "42501", message: "subscription_required" },
			"subscription_required",
		],
		[{ code: "22023", message: "invalid_sort" }, "invalid_request"],
		[{ code: "", message: "TypeError: Failed to fetch" }, "network"],
		[{ code: "", message: "TypeError: Network request failed" }, "network"],
		[{ code: "XX000", message: "internal" }, "unknown"],
	])("%o → %s", (error, expected) => {
		expect(toBlogReadingError(error).code).toBe(expected);
	});
});
