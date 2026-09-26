import { useEffect, useRef } from "react";

const AUTO_DISMISS_DELAY = 15000;

/** 제안 칩의 자동 거절 시간을 hover·focus 동안 일시 정지합니다. */
export const useSuggestionDismissTimer = (onDismiss: () => void) => {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const remainingMsRef = useRef(AUTO_DISMISS_DELAY);
	const startedAtRef = useRef<number | null>(null);
	const isActiveRef = useRef(false);
	const onDismissRef = useRef(onDismiss);
	onDismissRef.current = onDismiss;

	const clear = () => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		startedAtRef.current = null;
	};

	const resume = () => {
		if (!isActiveRef.current || timerRef.current !== null) {
			return;
		}
		startedAtRef.current = Date.now();
		timerRef.current = setTimeout(() => {
			clear();
			isActiveRef.current = false;
			onDismissRef.current();
		}, remainingMsRef.current);
	};

	const pause = () => {
		if (startedAtRef.current !== null) {
			remainingMsRef.current -= Date.now() - startedAtRef.current;
		}
		clear();
	};

	const start = () => {
		clear();
		remainingMsRef.current = AUTO_DISMISS_DELAY;
		isActiveRef.current = true;
		resume();
	};

	const stop = () => {
		clear();
		isActiveRef.current = false;
	};

	useEffect(() => {
		return () => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	return { start, pause, resume, stop };
};
