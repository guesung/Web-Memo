import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
	analytics: { trackMemoUpdate: vi.fn(), trackEvent: vi.fn() },
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
		queryClient = new QueryClient();
		getQueryClient.mockReturnValue(queryClient);
	});

	const mutate = async (variables: {
		id?: number;
		url?: string;
		data: Record<string, unknown>;
	}) => {
		const options = useMemoUpsertMutation() as unknown as ConstructorParameters<
			typeof MutationObserver
		>[1];
		const mutation = new MutationObserver(queryClient, options);

		return mutation.mutate(variables);
	};

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
	});
});
