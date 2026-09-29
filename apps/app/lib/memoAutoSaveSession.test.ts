import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	configureMemoAutoSaveSession as configure,
	editMemoAutoSaveSession as edit,
	flushMemoAutoSaveSession as flush,
	hydrateMemoAutoSaveSession as hydrate,
	openMemoAutoSaveSession as open,
	retryMemoAutoSaveCleanup as retryCleanup,
	setMemoAutoSaveOwner,
} from "./memoAutoSaveSession";
import type {
	MemoAutoSaveResult,
	MemoAutoSaveSession,
} from "./memoAutoSaveTypes";
import { createEmptyMemoPanelDraft } from "./memoDraft";

let owner = "";
beforeEach(() => {
	vi.useFakeTimers();
	owner = `user-${Math.random()}`;
	setMemoAutoSaveOwner(owner);
});
afterEach(() => {
	setMemoAutoSaveOwner("disposed");
	vi.useRealTimers();
});

function session(
	tabId = "tab-a",
	selectionId: number | string | null = null,
	pageKey = "page-a",
) {
	return open({
		owner,
		tabId,
		pageKey,
		url: `https://example.com/${pageKey}`,
		selectionId,
		targetId: selectionId,
		draft: createEmptyMemoPanelDraft(),
	});
}
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: Error) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
function bind(
	target: MemoAutoSaveSession,
	save = vi.fn(async () => ({ id: 1 })),
) {
	configure(target, { canSave: true, save });
	return save;
}

describe("메모 자동 저장 session", () => {
	it("hydration은 쓰지 않고 마지막 사용자 입력 뒤 1초를 기다린다", async () => {
		const target = session();
		const save = bind(target);
		hydrate(target, { ...target.draft, title: "페이지 자동 제목" });
		await vi.advanceTimersByTimeAsync(2000);
		expect(save).not.toHaveBeenCalled();
		edit(target, { memo: "첫 입력" });
		await vi.advanceTimersByTimeAsync(900);
		edit(target, { memo: "마지막 입력" });
		await vi.advanceTimersByTimeAsync(999);
		expect(save).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith(
			expect.objectContaining({
				draft: expect.objectContaining({ memo: "마지막 입력" }),
			}),
		);
	});

	it("신규 공백은 만들지 않고 직접 쓴 제목과 기존 내용 비우기는 저장한다", async () => {
		const empty = session();
		const saveEmpty = bind(empty);
		edit(empty, { memo: "  " });
		await flush(empty);
		expect(saveEmpty).not.toHaveBeenCalled();
		edit(empty, { title: "직접 쓴 제목" });
		await flush(empty);
		expect(saveEmpty).toHaveBeenCalledTimes(1);
		const existing = session("tab-b", 5);
		const saveExisting = bind(existing);
		edit(existing, { title: "", memo: "", impression: "", actionItem: "" });
		await flush(existing);
		expect(saveExisting).toHaveBeenCalledWith(
			expect.objectContaining({ targetId: 5 }),
		);
	});

	it("중복 flush는 같은 Promise이며 신규 저장 중 추가 입력은 반환 ID로 이어진다", async () => {
		const target = session();
		const first = deferred<MemoAutoSaveResult>();
		const save = vi
			.fn()
			.mockImplementationOnce(() => first.promise)
			.mockResolvedValue({ id: 11 });
		bind(target, save);
		edit(target, { memo: "첫 입력" });
		const pending = flush(target);
		expect(flush(target)).toBe(pending);
		await Promise.resolve();
		edit(target, { memo: "두 번째" });
		edit(target, { memo: "최종" });
		first.resolve({ id: 11 });
		await pending;
		expect(save).toHaveBeenCalledTimes(2);
		expect(save.mock.calls[1][0]).toMatchObject({
			targetId: 11,
			draft: { memo: "최종" },
		});
		expect(
			open({
				owner,
				tabId: "tab-a",
				pageKey: "page-a",
				url: target.url,
				selectionId: 11,
				targetId: 11,
				draft: createEmptyMemoPanelDraft(),
			}),
		).toBe(target);
		expect(target.savedRevision).toBe(target.revision);
	});

	it("실패한 A 초안은 B를 거쳐 돌아와도 유지하고 전환 flush로 반복 재시도하지 않는다", async () => {
		const a = session();
		const fail = vi.fn().mockRejectedValue(new Error("offline"));
		bind(a, fail);
		edit(a, { memo: "잃으면 안 되는 A" });
		await flush(a);
		const b = session("tab-a", null, "page-b");
		bind(b);
		edit(b, { memo: "B 내용" });
		await flush(b);
		expect(session()).toBe(a);
		expect(a.draft.memo).toBe("잃으면 안 되는 A");
		expect(a.failure).toBe("save");
		await flush(a);
		await vi.advanceTimersByTimeAsync(5000);
		expect(fail).toHaveBeenCalledTimes(1);
		const succeed = bind(a);
		edit(a, { actionItem: "복구 후 편집" });
		await vi.advanceTimersByTimeAsync(1000);
		expect(succeed).toHaveBeenCalledTimes(1);
		expect(a.failure).toBeNull();
	});

	it("늦은 A 응답은 B의 입력과 대상을 바꾸지 않는다", async () => {
		const a = session();
		const late = deferred<MemoAutoSaveResult>();
		bind(
			a,
			vi.fn(() => late.promise),
		);
		edit(a, { memo: "A" });
		const pending = flush(a);
		const b = session("tab-b", 22, "page-b");
		bind(b);
		edit(b, { memo: "B" });
		late.resolve({ id: 12 });
		await pending;
		expect(a.targetId).toBe(12);
		expect(b.targetId).toBe(22);
		expect(b.draft.memo).toBe("B");
	});

	it("같은 메모의 두 탭 쓰기를 직렬화하며 초안은 분리한다", async () => {
		const a = session("tab-a", 9);
		const b = session("tab-b", 9);
		const first = deferred<MemoAutoSaveResult>();
		const saveA = bind(
			a,
			vi.fn(() => first.promise),
		);
		const saveB = bind(b);
		edit(a, { memo: "A 입력" });
		edit(b, { memo: "B 입력" });
		const workA = flush(a);
		const workB = flush(b);
		await Promise.resolve();
		await Promise.resolve();
		expect(saveA).toHaveBeenCalledTimes(1);
		expect(saveB).not.toHaveBeenCalled();
		first.resolve({ id: 9 });
		await Promise.all([workA, workB]);
		expect(saveB).toHaveBeenCalledTimes(1);
		expect(a.draft.memo).toBe("A 입력");
		expect(b.draft.memo).toBe("B 입력");
	});

	it("계정 전환은 이전 타이머·대기 쓰기를 중지하고 늦은 ID도 새 scope에 붙이지 않는다", async () => {
		const a = session("tab-a", 9);
		const queued = session("tab-b", 9);
		const timed = session("tab-c", 10);
		const late = deferred<MemoAutoSaveResult>();
		bind(
			a,
			vi.fn(() => late.promise),
		);
		const saveQueued = bind(queued);
		const saveTimed = bind(timed);
		edit(a, { memo: "진행" });
		edit(queued, { memo: "대기" });
		edit(timed, { memo: "예약" });
		const aWork = flush(a);
		const qWork = flush(queued);
		await Promise.resolve();
		await Promise.resolve();
		setMemoAutoSaveOwner("next-user");
		owner = "next-user";
		const fresh = session("tab-a", 9);
		late.resolve({ id: 9 });
		await Promise.all([aWork, qWork]);
		await vi.advanceTimersByTimeAsync(2000);
		expect(saveQueued).not.toHaveBeenCalled();
		expect(saveTimed).not.toHaveBeenCalled();
		expect(session("tab-a", 9)).toBe(fresh);
		expect(fresh.draft.memo).toBe("");
	});

	it("원격 ID 확정 뒤 정리 실패는 정리만 재시도한다", async () => {
		const target = session();
		const cleanup = vi
			.fn()
			.mockRejectedValueOnce(new Error("storage"))
			.mockResolvedValue(undefined);
		const save = vi.fn(async () => ({ id: 6, cleanup }));
		bind(target, save);
		edit(target, {
			memo: "저장할 원본",
			pendingLocalId: "local-1",
			pendingSaveMode: "separate",
		});
		await flush(target);
		expect(target.targetId).toBe(6);
		expect(target.failure).toBe("cleanup");
		await retryCleanup(target);
		expect(cleanup).toHaveBeenCalledTimes(2);
		expect(save).toHaveBeenCalledTimes(1);
		expect(target.failure).toBeNull();
	});

	it("조회·선택 대기는 dirty 초안을 유지하며 허용 후 저장한다", async () => {
		const target = session();
		const save = vi.fn(async () => ({ id: 8 }));
		configure(target, { canSave: false, save });
		edit(target, { memo: "선택 전 초안" });
		await vi.advanceTimersByTimeAsync(2000);
		await flush(target);
		expect(save).not.toHaveBeenCalled();
		configure(target, { canSave: true, save });
		await vi.advanceTimersByTimeAsync(1000);
		expect(save).toHaveBeenCalledTimes(1);
	});
});
