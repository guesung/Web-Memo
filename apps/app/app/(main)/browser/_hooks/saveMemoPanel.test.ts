import { expect, it, vi } from "vitest";
import { saveMemoPanel } from "./saveMemoPanel";

const createSaveInput = () => {
	const remoteMutate = vi.fn();
	const localMutate = vi.fn();
	const onSaveSuccess = vi.fn().mockResolvedValue(true);
	const onSelectedMemoIdChange = vi.fn();
	const input: Parameters<typeof saveMemoPanel>[0] = {
		isChoosingMemo: false,
		isLoadingMemo: false,
		hasMemoError: false,
		pendingLocalId: null,
		pendingSaveMode: null,
		memoText: "A",
		impressionText: "",
		actionItemText: "",
		savedRevision: 1,
		isLoggedIn: true,
		pendingLocalMemos: [],
		url: "https://example.com/a",
		pageTitle: "A",
		titleText: "A",
		supabaseUpsert: { mutate: remoteMutate } as Parameters<
			typeof saveMemoPanel
		>[0]["supabaseUpsert"],
		localUpsert: { mutate: localMutate } as Parameters<
			typeof saveMemoPanel
		>[0]["localUpsert"],
		onSaveSuccess,
		onSelectedMemoIdChange,
		savedPageVersion: 3,
	};

	return {
		input,
		remoteMutate,
		localMutate,
		onSaveSuccess,
		onSelectedMemoIdChange,
	};
};

it("신규 원격 저장은 반환된 ID로 저장 중 추가 입력의 초안을 이어간다", async () => {
	const { input, remoteMutate, onSaveSuccess, onSelectedMemoIdChange } =
		createSaveInput();
	saveMemoPanel(input);
	await remoteMutate.mock.calls[0][1].onSuccess({ data: [{ id: 42 }] });

	expect(onSaveSuccess).toHaveBeenCalledWith(
		expect.objectContaining({ nextMemoId: 42, savedPageVersion: 3 }),
	);
	expect(onSelectedMemoIdChange).toHaveBeenCalledWith(42);
});

it("저장 중 다른 페이지로 이동했다면 이전 페이지 ID를 현재 화면에 선택하지 않는다", async () => {
	const { input, remoteMutate, onSaveSuccess, onSelectedMemoIdChange } =
		createSaveInput();
	onSaveSuccess.mockResolvedValue(false);
	saveMemoPanel(input);
	await remoteMutate.mock.calls[0][1].onSuccess({ data: [{ id: 42 }] });

	expect(onSelectedMemoIdChange).not.toHaveBeenCalled();
});

it("신규 로컬 저장도 반환된 ID로 초안을 이어간다", async () => {
	const { input, localMutate, onSaveSuccess, onSelectedMemoIdChange } =
		createSaveInput();
	input.isLoggedIn = false;
	saveMemoPanel(input);
	await localMutate.mock.calls[0][1].onSuccess({ id: "local-42" });

	expect(onSaveSuccess).toHaveBeenCalledWith(
		expect.objectContaining({ nextMemoId: "local-42" }),
	);
	expect(onSelectedMemoIdChange).toHaveBeenCalledWith("local-42");
});
