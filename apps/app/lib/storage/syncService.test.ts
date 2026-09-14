import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getSession: vi.fn(),
	getMemoByUrl: vi.fn(),
	insertMemo: vi.fn(),
	updateMemo: vi.fn(),
	getUnsyncedMemos: vi.fn(),
	markAsSynced: vi.fn(),
	clearSyncedMemos: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
	supabase: { auth: { getSession: mocks.getSession } },
}));
vi.mock("@web-memo/shared/utils/services", () => ({
	MemoService: class {
		getMemoByUrl = mocks.getMemoByUrl;
		insertMemo = mocks.insertMemo;
		updateMemo = mocks.updateMemo;
	},
}));
vi.mock("./localMemo", () => ({
	getUnsyncedMemos: mocks.getUnsyncedMemos,
	markAsSynced: mocks.markAsSynced,
	clearSyncedMemos: mocks.clearSyncedMemos,
}));

import { syncMemosToSupabase } from "./syncService";

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getSession.mockResolvedValue({
		data: { session: { user: { id: "user" } } },
	});
	mocks.getUnsyncedMemos.mockResolvedValue([
		{
			id: "local-1",
			url: "https://example.com",
			title: "Draft",
			memo: "Keep this draft",
		},
	]);
	mocks.getMemoByUrl.mockResolvedValue({ data: [], error: null });
	mocks.insertMemo.mockResolvedValue({ data: [{ id: 1 }], error: null });
});

describe("local memo synchronization", () => {
	it("keeps drafts unsynced when the free quota rejects an insert", async () => {
		mocks.insertMemo.mockResolvedValue({
			data: null,
			error: { message: "FREE_MEMO_LIMIT_REACHED" },
		});
		expect(await syncMemosToSupabase()).toEqual({ synced: 0, failed: 1 });
		expect(mocks.markAsSynced).not.toHaveBeenCalled();
		expect(mocks.clearSyncedMemos).not.toHaveBeenCalled();
	});
	it("does not treat a failed lookup as permission to insert", async () => {
		mocks.getMemoByUrl.mockResolvedValue({
			data: null,
			error: { message: "offline" },
		});
		expect(await syncMemosToSupabase()).toEqual({ synced: 0, failed: 1 });
		expect(mocks.insertMemo).not.toHaveBeenCalled();
	});
	it("requires returned server rows before marking a draft synced", async () => {
		mocks.insertMemo.mockResolvedValue({ data: [], error: null });
		expect(await syncMemosToSupabase()).toEqual({ synced: 0, failed: 1 });
		expect(mocks.markAsSynced).not.toHaveBeenCalled();
	});
	it("keeps the local copy even after a confirmed server save", async () => {
		expect(await syncMemosToSupabase()).toEqual({ synced: 1, failed: 0 });
		expect(mocks.markAsSynced).toHaveBeenCalledWith(["local-1"]);
		expect(mocks.clearSyncedMemos).not.toHaveBeenCalled();
	});
});
