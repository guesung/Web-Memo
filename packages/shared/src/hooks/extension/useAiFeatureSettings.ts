import { useEffect, useState } from "react";
import { ChromeSyncStorage, STORAGE_KEYS } from "../../modules/chrome-storage";

/** 값이 저장된 적 없으면 켜진 것으로 본다. 기능을 끄는 선택만 저장하므로 기존 사용자는 그대로 켜져 있다. */
const readEnabled = (storedValue: boolean | undefined) => storedValue ?? true;

/**
 * 페이지 요약·AI 채팅 사용 여부를 sync 저장소에서 읽고 구독한다.
 * @description 옵션 페이지에서 바꾸면 열려 있는 사이드 패널에도 바로 들어온다.
 * 아직 읽기 전이면 `isLoaded`가 false이고, 읽지 못하면 기본값(켜짐)으로 두지 않고 계속 false로 둔다.
 */
export default function useAiFeatureSettings() {
	const [isSummaryEnabled, setIsSummaryEnabled] = useState(true);
	const [isChatEnabled, setIsChatEnabled] = useState(true);
	const [isLoaded, setIsLoaded] = useState(false);

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
				/** 읽지 못한 설정을 켜짐으로 단정하지 않도록 로딩 상태로 둔다. */
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

	return { isLoaded, isSummaryEnabled, isChatEnabled };
}
