/** 판정에 쓰는 키보드 이벤트 속성입니다. */
type TShortcutEvent = Pick<
	KeyboardEvent,
	| "key"
	| "keyCode"
	| "metaKey"
	| "ctrlKey"
	| "altKey"
	| "shiftKey"
	| "repeat"
	| "isComposing"
	| "defaultPrevented"
>;

/** 카테고리 추천 수락 단축키(macOS는 Cmd+Enter, 그 외는 Ctrl+Enter)인지 판정합니다. */
export const isAcceptShortcut = (event: TShortcutEvent, isMacOS: boolean) => {
	if (event.key !== "Enter") return false;
	if (event.defaultPrevented || event.repeat) return false;
	// IME 조합 중 Enter는 글자 확정이므로 수락하지 않는다. 일부 브라우저는 keyCode 229만 준다.
	if (event.isComposing || event.keyCode === 229) return false;
	if (event.altKey || event.shiftKey) return false;

	return isMacOS
		? event.metaKey && !event.ctrlKey
		: event.ctrlKey && !event.metaKey;
};
