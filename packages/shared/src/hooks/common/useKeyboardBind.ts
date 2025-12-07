import { useEffect } from "react";

type KeyboardEventKey = "Backspace" | "Delete" | "Escape" | "s";

interface UseKeyboardBindProps {
	key: KeyboardEventKey;
	callback: () => void;
	isMetaKey?: boolean;
}

function isEditableElement(target: EventTarget | null): boolean {
	if (!target || !(target instanceof HTMLElement)) return false;

	const tagName = target.tagName.toLowerCase();
	if (tagName === "input" || tagName === "textarea") return true;
	if (target.isContentEditable) return true;

	return false;
}

export default function useKeyboardBind({
	key,
	callback,
	isMetaKey = false,
}: UseKeyboardBindProps) {
	useEffect(
		function keyboardBind() {
			const handleKeyDown = (event: KeyboardEvent) => {
				if (isEditableElement(event.target)) return;

				const metaKey = isMetaKey ? event.metaKey : true;
				if (metaKey && event.key === key) {
					event.preventDefault();

					callback();
				}
			};

			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		},
		[key, callback, isMetaKey],
	);
}
