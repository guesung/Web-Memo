import { useEffect, useState } from "react";
import { ChromeSyncStorage, STORAGE_KEYS } from "../../modules/chrome-storage";

/** 값이 저장된 적 없으면 켜진 것으로 본다. 기능을 끄는 선택만 저장하므로 기존 사용자는 그대로 켜져 있다. */
const readEnabled = (storedValue: boolean | undefined) => storedValue ?? true;

/**
 * 페이지 요약·AI 채팅 사용 여부를 sync 저장소에서 읽고 구독한다.
 * @description 옵션 페이지에서 바꾸면 열려 있는 사이드 패널에도 바로 들어온다.
 * 읽기 전이나 읽지 못했을 때 값은 켜짐이다. 읽기를 마쳤는지는 `isLoaded`, 읽기에 실패했는지는 `hasLoadFailed`로 구분한다.
 * 옵션 페이지는 `isLoaded` 전까지 입력을 잠가 읽지 못한 값을 덮어쓰지 않고, 사이드 패널은 실패하면 기존 동작(켜짐)으로 간다.
 */
export default function useAiFeatureSettings() {
	const [isSummaryEnabled, setIsSummaryEnabled] = useState(true);
	const [isChatEnabled, setIsChatEnabled] = useState(true);
	const [isLoaded, setIsLoaded] = useState(false);
	const [hasLoadFailed, setHasLoadFailed] = useState(false);

	useEffect(() => {
		let isStopped = false;
		const readSettings = async () => {
			try {
				const [summaryValue, chatValue] = await Promise.all([
					ChromeSyncStorage.get<boolean | undefined>(
						STORAGE_KEYS.summaryEnabled,
					),
					ChromeSyncStorage.get<boolean | undefined>(
						STORAGE_KEYS.aiChatEnabled,
					),
				]);
				if (isStopped) {
					return;
				}
				setIsSummaryEnabled(readEnabled(summaryValue));
				setIsChatEnabled(readEnabled(chatValue));
				setIsLoaded(true);
			} catch {
				if (!isStopped) {
					setHasLoadFailed(true);
				}
			}
		};
		void readSettings();
		const unsubscribers = [
			ChromeSyncStorage.subscribe<boolean>(
				STORAGE_KEYS.summaryEnabled,
				(value) => setIsSummaryEnabled(readEnabled(value)),
			),
			ChromeSyncStorage.subscribe<boolean>(
				STORAGE_KEYS.aiChatEnabled,
				(value) => setIsChatEnabled(readEnabled(value)),
			),
		];

		return () => {
			isStopped = true;
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
		};
	}, []);

	return { isLoaded, hasLoadFailed, isSummaryEnabled, isChatEnabled };
}
