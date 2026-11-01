interface IFNewMemoScreenParams {
	selection: { memoId: number | null; isNew?: boolean } | null;
	/** 현재 주소에 저장된 메모 수 */
	pageMemoCount: number;
	/** 새 메모의 첫 insert로 정해졌지만 선택이 아직 옮겨지지 않은 메모 id */
	createdMemoId: number | null;
}

/**
 * 아직 저장된 메모로 선택이 옮겨지지 않은 새 메모 화면인지 본다.
 * @description 새 메모 버튼으로 연 화면(`isNew`)뿐 아니라, 메모가 없는 페이지에서 자동으로 시작한 새 메모도
 * 첫 insert가 끝나 선택이 그 id로 옮겨지기 전까지는 새 메모 화면이다.
 */
export function isNewMemoScreen({
	selection,
	pageMemoCount,
	createdMemoId,
}: IFNewMemoScreenParams) {
	if (!selection) {
		return false;
	}
	if (selection.isNew) {
		return true;
	}

	return (
		selection.memoId === null && (pageMemoCount === 0 || createdMemoId !== null)
	);
}
