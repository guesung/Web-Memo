import { useCallback, useRef } from "react";

export default function useDebounce() {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const debounce = (callbackFn: () => void, delay = 300) => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}

		timerRef.current = setTimeout(() => {
			callbackFn();
			timerRef.current = null;
		}, delay);
	};

	const abortDebounce = useCallback(() => {
		if (!timerRef.current) return;

		clearTimeout(timerRef.current);
		timerRef.current = null;
	}, []);

	return { debounce, abortDebounce };
}
