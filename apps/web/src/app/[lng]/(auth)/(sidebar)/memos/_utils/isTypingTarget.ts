/** 글자 입력이나 커서 이동에 키가 쓰이는 곳인지. 단축키는 여기서 반응하지 않는다. */
export function isTypingTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.isContentEditable ||
		["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
	);
}
