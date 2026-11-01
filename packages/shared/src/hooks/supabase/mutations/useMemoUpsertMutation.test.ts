import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import useMemoUpsertMutation from "./useMemoUpsertMutation";

const { getQueryClient, getMemoById, getMemoByUrl, updateMemo, insertMemo } =
	vi.hoisted(() => ({
		getQueryClient: vi.fn(),
		getMemoById: vi.fn(),
		getMemoByUrl: vi.fn(),
		updateMemo: vi.fn(),
		insertMemo: vi.fn(),
	}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-query")>();

	return {
		...actual,
		useQueryClient: getQueryClient,
		useMutation: (options: unknown) => options,
	};
});
vi.mock("../queries", () => ({
	useSupabaseClientQuery: () => ({ data: {} }),
}));
vi.mock("../../../modules/analytics", () => ({
	analytics: {
		trackMemoUpdate: vi.fn(),
		trackMemoCreate: vi.fn(),
		trackEvent: vi.fn(),
		trackMemoSaveResult: vi.fn(),
	},
}));
vi.mock("../../../utils", () => ({
	MemoService: class {
		getMemoById = getMemoById;
		getMemoByUrl = getMemoByUrl;
		updateMemo = updateMemo;
		insertMemo = insertMemo;
	},
	getPageKey: (url: string) => url,
	getPathKey: (url: string) => url,
}));

describe("메모 upsert 저장 중 Supabase 오류", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(analytics.trackEvent).mockResolvedValue(undefined);
		vi.mocked(analytics.trackMemoCreate).mockResolvedValue(undefined);
		vi.mocked(analytics.trackMemoUpdate).mockResolvedValue(undefined);
		queryClient = new QueryClient();
		getQueryClient.mockReturnValue(queryClient);
	});

	const mutate = async (variables: {
		id?: number;
		url?: string;
		data: Record<string, unknown>;
		analyticsSource?: "side_panel";
		analyticsUserId?: string;
	}) => {
		const options = useMemoUpsertMutation() as unknown as ConstructorParameters<
			typeof MutationObserver
		>[1];
		const mutation = new MutationObserver(queryClient, options);

		return mutation.mutate(variables);
	};

	it("사이드 패널은 기존 작성 계측이 무응답이어도 서버 저장 완료를 반환한다", async () => {
		insertMemo.mockResolvedValueOnce({
			data: [{ id: 1, memo: "본문" }],
			error: null,
		});
		vi.mocked(analytics.trackEvent).mockImplementationOnce(
			() => new Promise(() => {}),
		);
		const result = await mutate({
			data: { memo: "본문" },
			analyticsSource: "side_panel",
			analyticsUserId: "user-a",
		});
		expect(result).toMatchObject({ data: [{ id: 1, memo: "본문" }] });
		expect(analytics.trackMemoSaveResult).toHaveBeenCalledTimes(1);
	});

	it("출처를 지정한 실제 write의 기존 행과 반환 행만 비동기로 계측한다", async () => {
		const before = { id: 1, url: "https://example.com", memo: "이전" };
		const after = { ...before, memo: "새 본문" };
		getMemoById.mockResolvedValueOnce({ data: [before], error: null });
		updateMemo.mockResolvedValueOnce({ data: [after], error: null });
		vi.mocked(analytics.trackMemoSaveResult).mockReturnValue(undefined);

		await mutate({
			id: 1,
			data: { memo: "새 본문" },
			analyticsSource: "side_panel",
			analyticsUserId: "user-a",
		});

		expect(analytics.trackMemoSaveResult).toHaveBeenCalledTimes(1);
		expect(analytics.trackMemoSaveResult).toHaveBeenCalledWith({
			before,
			after,
			isSuccess: true,
			source: "side_panel",
			userId: "user-a",
		});
	});

	it("출처를 지정해도 기존 메모 조회 실패는 write 결과로 세지 않는다", async () => {
		getMemoById.mockRejectedValueOnce(new Error("조회 실패"));
		await expect(
			mutate({
				id: 1,
				data: {},
				analyticsSource: "side_panel",
				analyticsUserId: "user-a",
			}),
		).rejects.toThrow("조회 실패");
		expect(analytics.trackMemoSaveResult).not.toHaveBeenCalled();
	});

	it("출처 없는 웹/앱 저장에는 새 결과 이벤트를 추가하지 않는다", async () => {
		insertMemo.mockResolvedValueOnce({ data: [{ id: 1 }], error: null });
		await mutate({ data: { memo: "본문" } });
		expect(analytics.trackMemoSaveResult).not.toHaveBeenCalled();
	});

	it("write reject는 실패 결과를 한 번 기록하고 기존 오류를 유지한다", async () => {
		const error = new TypeError("Failed to fetch");
		insertMemo.mockRejectedValueOnce(error);
		await expect(
			mutate({
				data: { memo: "본문" },
				analyticsSource: "side_panel",
				analyticsUserId: "user-a",
			}),
		).rejects.toBe(error);
		expect(analytics.trackMemoSaveResult).toHaveBeenCalledTimes(1);
		expect(analytics.trackMemoSaveResult).toHaveBeenCalledWith({
			isSuccess: false,
			source: "side_panel",
			userId: "user-a",
			error,
		});
	});

	it("id로 기존 메모를 조회하다 오류가 나면 성공으로 처리하지 않는다", async () => {
		getMemoById.mockResolvedValueOnce({
			data: null,
			error: new Error("조회 실패"),
		});

		await expect(
			mutate({ id: 1, url: "https://example.com", data: {} }),
		).rejects.toThrow("조회 실패");
		expect(updateMemo).not.toHaveBeenCalled();
		expect(insertMemo).not.toHaveBeenCalled();
	});

	it("url로 기존 메모를 조회하다 오류가 나면 insert로 떨어지지 않는다", async () => {
		getMemoByUrl.mockResolvedValueOnce({
			data: null,
			error: new Error("조회 실패"),
		});

		await expect(
			mutate({ url: "https://example.com", data: {} }),
		).rejects.toThrow("조회 실패");
		expect(insertMemo).not.toHaveBeenCalled();
	});

	it("기존 메모가 있을 때 update 오류를 throw한다", async () => {
		getMemoById.mockResolvedValueOnce({
			data: [{ id: 1, url: "https://example.com" }],
			error: null,
		});
		updateMemo.mockResolvedValueOnce({
			data: null,
			error: new Error("수정 실패"),
		});

		await expect(
			mutate({ id: 1, url: "https://example.com", data: {} }),
		).rejects.toThrow("수정 실패");
		expect(analytics.trackMemoUpdate).not.toHaveBeenCalled();
		expect(analytics.trackEvent).not.toHaveBeenCalled();
	});

	it("같은 값을 다시 저장하면 메모 변경 이벤트를 보내지 않는다", async () => {
		const data = {
			url: "https://example.com",
			title: "제목",
			memo: "내용",
			isWish: false,
			isStar: true,
			isReading: false,
			category_id: 3,
		};
		getMemoById.mockResolvedValueOnce({
			data: [{ id: 1, ...data }],
			error: null,
		});
		updateMemo.mockResolvedValueOnce({ data: [{ id: 1 }], error: null });

		await mutate({ id: 1, url: data.url, data });

		expect(analytics.trackMemoUpdate).not.toHaveBeenCalled();
		expect(analytics.trackEvent).not.toHaveBeenCalled();
	});

	it("캐시가 비어 있어도 기존 메모의 실제 변경 필드만 기록한다", async () => {
		const url = "https://example.com";
		getMemoByUrl.mockResolvedValueOnce({
			data: [
				{
					id: 1,
					url,
					title: "이전 제목",
					memo: "같은 내용",
					isWish: false,
					category_id: 3,
				},
			],
			error: null,
		});
		updateMemo.mockResolvedValueOnce({ data: [{ id: 1 }], error: null });

		await mutate({
			url,
			data: {
				url,
				title: "새 제목",
				memo: "같은 내용",
				isWish: false,
				category_id: 3,
			},
		});

		expect(analytics.trackMemoUpdate).toHaveBeenCalledWith({
			title: "새 제목",
		});
		expect(analytics.trackEvent).not.toHaveBeenCalled();
	});

	it("기존 메모가 없을 때 insert 오류를 throw한다", async () => {
		getMemoByUrl.mockResolvedValueOnce({ data: [], error: null });
		insertMemo.mockResolvedValueOnce({
			data: null,
			error: new Error("생성 실패"),
		});

		await expect(
			mutate({ url: "https://example.com", data: {} }),
		).rejects.toThrow("생성 실패");
		expect(analytics.trackMemoUpdate).not.toHaveBeenCalled();
		expect(analytics.trackEvent).not.toHaveBeenCalled();
	});

	it("캐시에 기존 후보가 있어도 조회 결과가 없으면 첫 작성만 기록한다", async () => {
		const url = "https://example.com";
		queryClient.setQueryData(QUERY_KEY.memo({ url }), {
			data: [{ id: 1, url }],
			error: null,
		});
		getMemoByUrl.mockResolvedValueOnce({ data: [], error: null });
		insertMemo.mockResolvedValueOnce({ data: [{ id: 2 }], error: null });

		const result = await mutate({
			url,
			data: { url, title: "제목", memo: "내용" },
		});

		expect(result).toEqual({ data: [{ id: 2 }], error: null });
		expect(analytics.trackEvent).toHaveBeenCalledWith({
			name: "memo_first_write",
		});
		expect(analytics.trackMemoCreate).toHaveBeenCalledWith({
			url,
			title: "제목",
			memo: "내용",
		});
		expect(analytics.trackMemoUpdate).not.toHaveBeenCalled();
	});

	it("새 메모에 계획 날짜가 있으면 첫 작성과 함께 날짜 배정도 기록한다", async () => {
		const url = "https://example.com";
		getMemoByUrl.mockResolvedValueOnce({ data: [], error: null });
		insertMemo.mockResolvedValueOnce({ data: [{ id: 2 }], error: null });

		await mutate({ url, data: { url, plannedDate: "2026-10-12" } });

		expect(analytics.trackEvent).toHaveBeenCalledWith({
			name: "memo_first_write",
		});
		expect(analytics.trackMemoUpdate).toHaveBeenCalledWith({
			plannedDate: "2026-10-12",
		});
	});

	it("저장에 성공하면 블로그 정주행 완료 캐시도 무효화한다", async () => {
		const blogPageKey = QUERY_KEY.blogReadingPage("user-1", {
			blogId: null,
			sort: "oldest",
		});
		const blogSummaryKey = QUERY_KEY.blogReadingSummary("user-1");
		queryClient.setQueryData(blogPageKey, { pages: [], pageParams: [] });
		queryClient.setQueryData(blogSummaryKey, { sources: [] });
		getMemoByUrl.mockResolvedValueOnce({ data: [], error: null });
		insertMemo.mockResolvedValueOnce({ data: [{ id: 1 }], error: null });

		await mutate({ url: "https://toss.tech/article/x", data: {} });

		expect(queryClient.getQueryState(blogPageKey)?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(blogSummaryKey)?.isInvalidated).toBe(true);
	});
});
