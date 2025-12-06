import { useEffect } from "react";

type KeyboardEventKey = "Backspace" | "Delete" | "Escape" | "s";

interface UseKeyboardBindProps {
	key: KeyboardEventKey;
	callback: () => void;
	isMetaKey?: boolean;
}

export default function useKeyboardBind({
	key,
	callback,
	isMetaKey = false,
}: UseKeyboardBindProps) {
	useEffect(
		function keyboardBind() {
			const handleKeyDown = (event: KeyboardEvent) => {
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
