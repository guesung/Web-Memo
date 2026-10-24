/**
 * 기존 메모 내용 뒤에 새 메모를 줄바꿈으로 이어 붙인다.
 * @param existingMemo 기존 메모 내용
 * @param newText 새로 추가할 메모 내용
 * @returns 이어 붙인 메모 내용. 기존 내용이 비어 있으면 새 내용만 반환한다.
 */
export function appendMemoText(existingMemo: string, newText: string): string {
	const trimmedExisting = existingMemo.trim();
	if (!trimmedExisting) {
		return newText;
	}
	return `${trimmedExisting}\n${newText}`;
}
