import { useEffect } from "react";

interface UseKeyboardBindProps {
	key: string;
	callback: () => void;
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
}

export default function useKeyboardBind({
	key,
	callback,
	ctrlKey = false,
	metaKey = false,
	shiftKey = false,
	altKey = false,
}: UseKeyboardBindProps) {
	useEffect(
		function keyboardBind() {
			const handleKeyDown = (event: KeyboardEvent) => {
				const hasModifier = ctrlKey || metaKey || shiftKey || altKey;

				if (hasModifier) {
					const ctrlMatch = ctrlKey ? event.ctrlKey : true;
					const metaMatch = metaKey ? event.metaKey : true;
					const shiftMatch = shiftKey ? event.shiftKey : true;
					const altMatch = altKey ? event.altKey : true;

					if (
						ctrlMatch &&
						metaMatch &&
						shiftMatch &&
						altMatch &&
						event.key.toLowerCase() === key.toLowerCase()
					) {
						event.preventDefault();
						callback();
					}
				} else {
					if (event.key === key && !event.ctrlKey && !event.metaKey) {
						event.preventDefault();
						callback();
					}
				}
			};

			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		},
		[key, callback, ctrlKey, metaKey, shiftKey, altKey],
	);
}
