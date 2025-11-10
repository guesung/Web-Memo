import { useEffect, type RefObject } from "react";

export function useAutoResizeTextarea(
	textareaRef: RefObject<HTMLTextAreaElement>,
) {
	useEffect(() => {
		if (!textareaRef.current) return;
		textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
	}, [textareaRef]);
}
