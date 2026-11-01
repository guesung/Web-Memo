import { useEffect, useState } from "react";
import {
	getWebNoticeDismissed,
	saveWebNoticeDismissed,
} from "@/lib/storage/webNotice";

/**
 * 웹 안내 배너의 닫힘 상태를 AsyncStorage와 동기화한다.
 * @description
 * 저장값을 읽기 전에는 깜빡임을 막기 위해 닫힌 상태(true)로 취급한다.
 */
export function useWebNoticeDismissed() {
	const [isDismissed, setIsDismissed] = useState(true);

	useEffect(() => {
		const loadDismissed = async () => {
			setIsDismissed(await getWebNoticeDismissed());
		};

		loadDismissed();
	}, []);

	const handleDismiss = () => {
		setIsDismissed(true);
		saveWebNoticeDismissed();
	};

	return { isDismissed, handleDismiss };
}
