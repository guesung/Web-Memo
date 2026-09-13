import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getMemoByUrl: vi.fn(),
	getMemoById: vi.fn(),
	insertMemo: vi.fn(),
	updateMemo: vi.fn(),
	setQueryData: vi.fn(),
	getQueryData: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
	useMutation: (options: unknown) => options,
	useQueryClient: () => ({
		cancelQueries: vi.fn(),
		getQueryData: mocks.getQueryData,
		setQueryData: mocks.setQueryData,
		invalidateQueries: vi.fn(),
	}),
}));
vi.mock("../queries", () => ({ useSupabaseClientQuery: () => ({ data: {} }) }));
vi.mock("../../../utils", () => ({
	normalizeUrl: (url: string) => url,
	MemoService: class {
		getMemoByUrl = mocks.getMemoByUrl;
		getMemoById = mocks.getMemoById;
		insertMemo = mocks.insertMemo;
		updateMemo = mocks.updateMemo;
	},
}));
vi.mock("../../../modules/analytics", () => ({
	analytics: { trackMemoUpdate: vi.fn() },
}));

import useMemoUpsertMutation from "./useMemoUpsertMutation";

/** React 렌더링 없이 검사할 저장 뮤테이션 콜백입니다. */
interface IFMutationCallbacks {
	mutationFn: (input: {
		url: string;
		data: { memo: string };
	}) => Promise<unknown>;
	onMutate: (input: {
		url: string;
		data: { memo: string };
	}) => Promise<unknown>;
}
beforeEach(() => {
	vi.clearAllMocks();
	mocks.getMemoByUrl.mockResolvedValue({ data: [], error: null });
	mocks.getQueryData.mockReturnValue(undefined);
});
describe("new memo failure safety", () => {
	it("throws a quota error rather than reporting a successful save", async () => {
		const quotaError = { message: "FREE_MEMO_LIMIT_REACHED" };
		mocks.insertMemo.mockResolvedValue({ data: null, error: quotaError });
		const mutation = useMemoUpsertMutation() as unknown as IFMutationCallbacks;
		await expect(
			mutation.mutationFn({
				url: "https://example.com",
				data: { memo: "Keep draft" },
			}),
		).rejects.toBe(quotaError);
	});
	it("does not create a synthetic memo ID that resets the form before a save", async () => {
		const mutation = useMemoUpsertMutation() as unknown as IFMutationCallbacks;
		await mutation.onMutate({
			url: "https://example.com",
			data: { memo: "Keep draft" },
		});
		expect(mocks.setQueryData).not.toHaveBeenCalled();
	});
	it("does not create a duplicate after a failed existing-memo lookup", async () => {
		const lookupError = { message: "network error" };
		mocks.getMemoByUrl.mockResolvedValue({ data: null, error: lookupError });
		const mutation = useMemoUpsertMutation() as unknown as IFMutationCallbacks;
		await expect(
			mutation.mutationFn({
				url: "https://example.com",
				data: { memo: "Keep draft" },
			}),
		).rejects.toBe(lookupError);
		expect(mocks.insertMemo).not.toHaveBeenCalled();
	});
});
