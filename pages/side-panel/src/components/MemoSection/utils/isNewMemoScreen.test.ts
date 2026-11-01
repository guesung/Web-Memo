import { expect, it } from "vitest";
import { isNewMemoScreen } from "./isNewMemoScreen";

it("새 메모 버튼으로 연 화면은 첫 insert가 진행 중이든 끝났든 선택이 옮겨질 때까지 새 메모 화면이다", () => {
	const selection = { memoId: null, isNew: true };

	expect(
		isNewMemoScreen({ selection, pageMemoCount: 2, createdMemoId: null }),
	).toBe(true);
	expect(
		isNewMemoScreen({ selection, pageMemoCount: 2, createdMemoId: 7 }),
	).toBe(true);
});

it("메모가 없는 페이지에서 자동으로 시작한 새 메모도 첫 insert 전후로 새 메모 화면이다", () => {
	const selection = { memoId: null };

	expect(
		isNewMemoScreen({ selection, pageMemoCount: 0, createdMemoId: null }),
	).toBe(true);
	expect(
		isNewMemoScreen({ selection, pageMemoCount: 0, createdMemoId: 7 }),
	).toBe(true);
	expect(
		isNewMemoScreen({ selection, pageMemoCount: 1, createdMemoId: 7 }),
	).toBe(true);
});

it("저장된 메모를 편집 중이거나 선택이 없으면 새 메모 화면이 아니다", () => {
	expect(
		isNewMemoScreen({
			selection: { memoId: 7 },
			pageMemoCount: 3,
			createdMemoId: 7,
		}),
	).toBe(false);
	expect(
		isNewMemoScreen({ selection: null, pageMemoCount: 0, createdMemoId: null }),
	).toBe(false);
});

it("메모가 여러 개인데 아직 고르지 않은 선택은 새 메모 화면이 아니다", () => {
	expect(
		isNewMemoScreen({
			selection: { memoId: null },
			pageMemoCount: 3,
			createdMemoId: null,
		}),
	).toBe(false);
});
