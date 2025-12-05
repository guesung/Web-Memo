import { useEffect, useRef } from "react";

export default function useDidMount(callbackFn: () => void) {
	const mountRef = useRef(false);
	const savedCallback = useRef(callbackFn);

	useEffect(() => {
		savedCallback.current = callbackFn;
	});

	useEffect(() => {
		if (mountRef.current) return;
		savedCallback.current();
		mountRef.current = true;
	}, []);

	return null;
}
