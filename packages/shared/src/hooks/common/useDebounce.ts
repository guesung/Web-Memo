import { useCallback, useRef } from "react";

export default function useDebounce() {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const callbackRef = useRef<(() => void) | null>(null);

	const debounce = (callbackFn: () => void, delay = 300) => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}

		callbackRef.current = callbackFn;
		timerRef.current = setTimeout(() => {
			callbackFn();
			timerRef.current = null;
			callbackRef.current = null;
		}, delay);
	};

	const abortDebounce = useCallback(() => {
		if (!timerRef.current) return;

		clearTimeout(timerRef.current);
		timerRef.current = null;
		callbackRef.current = null;
	}, []);

	/**
	 * 대기 중인 debounce 콜백을 즉시 실행한다.
	 * @description 모달을 닫는 등 debounce 지연을 기다릴 수 없는 상황에서 마지막 변경을 곧바로 반영할 때 사용한다.
	 */
	const flushDebounce = useCallback(() => {
		if (!timerRef.current) return;

		clearTimeout(timerRef.current);
		timerRef.current = null;

		const pendingCallback = callbackRef.current;
		callbackRef.current = null;
		pendingCallback?.();
	}, []);

	return { debounce, abortDebounce, flushDebounce };
}
