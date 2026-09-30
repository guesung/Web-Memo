import { beforeEach, expect, it, vi } from "vitest";
import { useMemoUpsertMutation } from "./useMemoMutation";

const mocks = vi.hoisted(() => ({
	mutationFn: undefined as ((input: never) => Promise<unknown>) | undefined,
	getMemoByUrl: vi.fn(),
	insertMemo: vi.fn(),
	updateMemo: vi.fn(),
	getSession: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
	useMutation: (options: {
		mutationFn: (input: never) => Promise<unknown>;
	}) => {
		mocks.mutationFn = options.mutationFn;
		return {};
	},
	useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/lib/analytics/appAnalytics", () => ({ trackAppEvent: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
	memoService: mocks,
	supabase: { auth: { getSession: mocks.getSession } },
}));
beforeEach(() => {
	vi.clearAllMocks();
	mocks.getMemoByUrl.mockResolvedValue({ data: [], error: null });
	mocks.insertMemo.mockResolvedValue({ data: [{ id: 42 }], error: null });
	mocks.getSession.mockResolvedValue({
		data: { session: { user: { id: "owner" } } },
	});
	useMemoUpsertMutation();
});

it("예상 신규 대상에 후보가 생겼으면 임의로 덮어쓰거나 추가 생성하지 않는다", async () => {
	mocks.getMemoByUrl.mockResolvedValue({ data: [{ id: 1 }], error: null });
	await expect(
		mocks.mutationFn?.({
			url: "https://example.com",
			memo: "edit",
			expectedNew: true,
		} as never),
	).rejects.toThrow("다시 선택");
	expect(mocks.updateMemo).not.toHaveBeenCalled();
	expect(mocks.insertMemo).not.toHaveBeenCalled();
});

it("후보가 없는 예상 신규 대상은 반환된 ID를 확인한다", async () => {
	await expect(
		mocks.mutationFn?.({
			url: "https://example.com",
			memo: "edit",
			expectedNew: true,
			expectedOwnerId: "owner",
		} as never),
	).resolves.toEqual({ data: [{ id: 42 }], error: null, isExisting: false });
	expect(mocks.insertMemo).toHaveBeenCalledWith({
		url: "https://example.com",
		memo: "edit",
	});
});

it("계정이 달라졌으면 이전 owner 초안을 보내지 않는다", async () => {
	mocks.getSession.mockResolvedValue({
		data: { session: { user: { id: "other" } } },
	});
	await expect(
		mocks.mutationFn?.({
			url: "https://example.com",
			memo: "edit",
			expectedOwnerId: "owner",
		} as never),
	).rejects.toThrow("계정이 변경");
	expect(mocks.insertMemo).not.toHaveBeenCalled();
});

it("명시적으로 별도 저장을 선택하면 기존 후보와 분리해 생성한다", async () => {
	mocks.getMemoByUrl.mockResolvedValue({ data: [{ id: 1 }], error: null });
	await mocks.mutationFn?.({
		url: "https://example.com",
		memo: "edit",
		expectedNew: true,
		createSeparate: true,
	} as never);
	expect(mocks.insertMemo).toHaveBeenCalled();
});
