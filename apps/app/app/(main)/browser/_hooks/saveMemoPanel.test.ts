import { expect, it, vi } from "vitest";
import { saveMemoPanel } from "./saveMemoPanel";

function createSaveInput() {
	const saveRemote = vi.fn().mockResolvedValue({ data: [{ id: 42 }] });
	const saveLocal = vi.fn().mockResolvedValue({ id: "local-42" });
	const cleanupLocal = vi.fn().mockResolvedValue(undefined);
	const input: Parameters<typeof saveMemoPanel>[0] = {
		snapshot: {
			owner: "user",
			url: "https://example.com/a",
			targetId: null,
			draft: {
				title: "A",
				memo: "A",
				impression: "",
				actionItem: "",
				pendingLocalId: null,
				pendingSaveMode: null,
			},
			titleEdited: false,
			revision: 1,
		},
		pageTitle: "A",
		pendingLocalMemos: [],
		saveRemote,
		saveLocal,
		cleanupLocal,
	};
	return { input, saveRemote, saveLocal, cleanupLocal };
}

it("신규 원격 저장은 화면 콜백과 독립적으로 반환된 ID를 원래 session에 전달한다", async () => {
	const { input, saveRemote } = createSaveInput();
	await expect(saveMemoPanel(input)).resolves.toEqual({
		id: 42,
		cleanup: undefined,
	});
	expect(saveRemote).toHaveBeenCalledWith(
		expect.objectContaining({ expectedNew: true, expectedOwnerId: "user" }),
	);
});

it("저장 실패를 반환하여 다른 화면에 성공 ID를 연결하지 않는다", async () => {
	const { input, saveRemote, saveLocal } = createSaveInput();
	saveRemote.mockRejectedValue(new Error("offline"));
	await expect(saveMemoPanel(input)).rejects.toThrow("offline");
	expect(saveLocal).not.toHaveBeenCalled();
});

it("신규 로컬 저장도 반환된 ID로 초안을 이어간다", async () => {
	const { input, saveRemote, saveLocal } = createSaveInput();
	input.snapshot.owner = "guest";
	await expect(saveMemoPanel(input)).resolves.toEqual({ id: "local-42" });
	expect(saveRemote).not.toHaveBeenCalled();
	expect(saveLocal).toHaveBeenCalledWith(
		expect.objectContaining({ expectedNew: true }),
	);
});

it("원격 ID를 확정한 다음 별도로 원본을 정리하고 정리 재시도는 원격 쓰기를 반복하지 않는다", async () => {
	const { input, cleanupLocal, saveRemote } = createSaveInput();
	input.snapshot.draft.pendingLocalId = "source";
	input.snapshot.draft.pendingSaveMode = "separate";
	input.pendingLocalMemos = [
		{
			id: "source",
			url: input.snapshot.url,
			title: "source",
			memo: "draft",
			synced: false,
			createdAt: "",
			updatedAt: "",
			isStar: true,
		},
	];
	const result = await saveMemoPanel(input);
	expect(result.id).toBe(42);
	expect(cleanupLocal).not.toHaveBeenCalled();
	await result.cleanup?.();
	await result.cleanup?.();
	expect(saveRemote).toHaveBeenCalledTimes(1);
	expect(cleanupLocal).toHaveBeenCalledTimes(2);
	expect(saveRemote).toHaveBeenCalledWith(
		expect.objectContaining({ createSeparate: true, isStar: true }),
	);
});

it("기존 메모 내용을 비운 snapshot도 명시 ID update로 전달한다", async () => {
	const { input, saveRemote } = createSaveInput();
	input.snapshot.targetId = 12;
	input.snapshot.draft.memo = "";
	await saveMemoPanel(input);
	expect(saveRemote).toHaveBeenCalledWith(
		expect.objectContaining({ selectedId: 12, memo: "", expectedNew: false }),
	);
});
