import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUERY_KEY } from "../../constants/QueryKey";
import type { MemoSupabaseClient } from "../../types/supabaseCustom";
import { useBlogSubscriptionMutation } from "./useBlogSubscriptionMutation";
import { useBlogSyncRequestMutation } from "./useBlogSyncRequestMutation";

const { getQueryClient, setBlogSubscription, requestBlogSync } = vi.hoisted(
	() => ({
		getQueryClient: vi.fn(),
		setBlogSubscription: vi.fn(),
		requestBlogSync: vi.fn(),
	}),
);

vi.mock("@tanstack/react-query", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-query")>()),
	useQueryClient: getQueryClient,
	useMutation: (options: unknown) => options,
}));
vi.mock("../../utils/supabase/blogReadingService", () => ({
	setBlogSubscription,
	requestBlogSync,
}));

const PAGE_KEY = QUERY_KEY.blogReadingPage("user-1", {
	blogId: null,
	sort: "oldest",
});
const SUMMARY_KEY = QUERY_KEY.blogReadingSummary("user-1");
const OTHER_USER_KEY = QUERY_KEY.blogReadingSummary("user-2");
const HOOK_PARAMS = {
	supabaseClient: {} as MemoSupabaseClient,
	userId: "user-1",
};

/** 훅이 돌려준 옵션을 실제 MutationObserver로 실행한다. */
const runMutation = async (
	queryClient: QueryClient,
	options: unknown,
	variables: unknown,
) => {
	const mutation = new MutationObserver(
		queryClient,
		options as ConstructorParameters<typeof MutationObserver>[1],
	);

	await mutation.mutate(variables).catch(() => {});

	return mutation.getCurrentResult();
};

describe("블로그 정주행 mutation 캐시 갱신", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		queryClient = new QueryClient();
		getQueryClient.mockReturnValue(queryClient);
		queryClient.setQueryData(PAGE_KEY, { pages: [{}], pageParams: [{}] });
		queryClient.setQueryData(SUMMARY_KEY, { sources: [] });
		queryClient.setQueryData(OTHER_USER_KEY, { sources: [] });
	});

	it("구독 변경 성공은 목록 스냅샷을 비우고 요약을 무효화한다", async () => {
		setBlogSubscription.mockResolvedValue({ blogId: "toss", active: true });

		const result = await runMutation(
			queryClient,
			useBlogSubscriptionMutation(HOOK_PARAMS),
			{ blogId: "toss", active: true },
		);

		expect(result.status).toBe("success");
		expect(setBlogSubscription).toHaveBeenCalledWith(
			expect.objectContaining({ blogId: "toss", active: true }),
		);
		expect(queryClient.getQueryData(PAGE_KEY)).toBeUndefined();
		expect(queryClient.getQueryState(SUMMARY_KEY)?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(OTHER_USER_KEY)?.isInvalidated).toBe(
			false,
		);
	});

	it("구독 변경 실패는 캐시를 건드리지 않는다", async () => {
		setBlogSubscription.mockRejectedValue(new Error("실패"));

		const result = await runMutation(
			queryClient,
			useBlogSubscriptionMutation(HOOK_PARAMS),
			{ blogId: "toss", active: false },
		);

		expect(result.status).toBe("error");
		expect(queryClient.getQueryData(PAGE_KEY)).toBeDefined();
		expect(queryClient.getQueryState(SUMMARY_KEY)?.isInvalidated).toBe(false);
	});

	it("재개 요청 성공은 스냅샷을 유지한 채 본인 목록·요약만 무효화한다", async () => {
		requestBlogSync.mockResolvedValue({ blogId: "daangn", status: "queued" });

		await runMutation(queryClient, useBlogSyncRequestMutation(HOOK_PARAMS), {
			blogId: "daangn",
		});

		expect(queryClient.getQueryData(PAGE_KEY)).toBeDefined();
		expect(queryClient.getQueryState(PAGE_KEY)?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(SUMMARY_KEY)?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(OTHER_USER_KEY)?.isInvalidated).toBe(
			false,
		);
	});
});
