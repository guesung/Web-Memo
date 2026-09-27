import { useEffect, useState } from "react";

/**
 * 브라우저의 온라인·오프라인 상태를 구독한다.
 * @description `navigator.onLine`을 초기값으로 쓰고, `online`·`offline` 이벤트로 갱신한다.
 */
export default function useOnlineStatus() {
	const [isOnline, setIsOnline] = useState(() => navigator.onLine);

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	return isOnline;
}
