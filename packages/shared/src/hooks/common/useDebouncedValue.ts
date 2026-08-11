import { useEffect, useState } from "react";

const DEFAULT_DELAY = 300;

/**
 * 값이 delay(ms) 동안 바뀌지 않을 때까지 기다렸다가 반영한 값을 돌려준다.
 * @description 검색어처럼 타이핑마다 서버 요청이 나가는 것을 막을 때 사용한다.
 */
export default function useDebouncedValue<T>(
	value: T,
	delay = DEFAULT_DELAY,
): T {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timerId = setTimeout(() => setDebouncedValue(value), delay);

		return () => clearTimeout(timerId);
	}, [value, delay]);

	return debouncedValue;
}
