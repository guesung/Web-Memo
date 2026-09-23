import { SUPABASE } from "@web-memo/shared/constants";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
	type StorageKeyType,
} from "@web-memo/shared/modules/chrome-storage";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { useEffect, useState } from "react";

/**
 * 선택 버블을 띄워도 되는지와 첫 선택 말풍선을 함께 보여줄지 알려준다.
 * @description 로그인 여부·버블 설정을 아직 모르거나 읽지 못하면 버블을 막는다.
 * 옵션 페이지·다른 탭에서 바꾼 설정과 세션 변화도 sync 구독으로 따라간다.
 */
export const useHighlightBubbleGate = () => {
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [isBubbleEnabled, setIsBubbleEnabled] = useState<boolean | null>(null);
	const [isIntroSeen, setIsIntroSeen] = useState<boolean | null>(null);
	const [disabledSites, setDisabledSites] = useState<string[] | null>(null);
	const [bubblePosition, setBubblePosition] = useState<"above" | "below">(
		"below",
	);
	const [positionSettingStatus, setPositionSettingStatus] = useState<
		"loading" | "ready" | "error"
	>("loading");
	useEffect(() => {
		let isStopped = false;
		let loginGeneration = 0;
		const refreshLoginStatus = async () => {
			const requestGeneration = ++loginGeneration;
			let nextIsLoggedIn = false;
			try {
				const response = await bridge.request.GET_LOGIN_STATUS();
				nextIsLoggedIn = response?.isLoggedIn === true;
			} catch {
				/** 확인에 실패하면 로그인하지 않은 것으로 본다. */
			}
			if (isStopped || requestGeneration !== loginGeneration) {
				return;
			}
			setIsLoggedIn(nextIsLoggedIn);
		};
		const readSettings = async () => {
			try {
				const [storedBubbleEnabled, storedIntroSeen, storedDisabledSites] =
					await Promise.all([
						ChromeSyncStorage.get<boolean | undefined>(
							STORAGE_KEYS.highlightBubbleEnabled,
						),
						ChromeSyncStorage.get<boolean | undefined>(
							STORAGE_KEYS.highlightIntroSeen,
						),
						ChromeSyncStorage.get<string[] | undefined>(
							STORAGE_KEYS.highlightDisabledSites,
						),
					]);
				if (isStopped) {
					return;
				}
				setIsBubbleEnabled(storedBubbleEnabled ?? true);
				setIsIntroSeen(storedIntroSeen === true);
				setDisabledSites(
					Array.isArray(storedDisabledSites) ? storedDisabledSites : [],
				);
			} catch {
				/** 설정을 읽지 못하면 null로 남겨 버블을 막는다. */
			}
		};
		void refreshLoginStatus();
		void readSettings();
		const unsubscribers = [
			ChromeSyncStorage.subscribe<boolean>(
				STORAGE_KEYS.highlightBubbleEnabled,
				(value) => setIsBubbleEnabled(value ?? true),
			),
			ChromeSyncStorage.subscribe<boolean>(
				STORAGE_KEYS.highlightIntroSeen,
				(value) => setIsIntroSeen(value === true),
			),
			ChromeSyncStorage.subscribe<string[]>(
				STORAGE_KEYS.highlightDisabledSites,
				(value) => setDisabledSites(Array.isArray(value) ? value : []),
			),
			/** Supabase 세션은 STORAGE_KEYS 밖의 키로 sync에 저장된다(utils/extension/Supabase.ts와 같은 단언). */
			ChromeSyncStorage.subscribe(SUPABASE.authToken as StorageKeyType, () => {
				void refreshLoginStatus();
			}),
		];

		return () => {
			isStopped = true;
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
		};
	}, []);
	useEffect(() => {
		let isStopped = false;
		const readBubblePosition = async () => {
			try {
				const value = await ChromeSyncStorage.get<
					"above" | "below" | undefined
				>(STORAGE_KEYS.highlightBubblePosition);
				if (!isStopped) {
					setBubblePosition(value === "above" ? "above" : "below");
					setPositionSettingStatus("ready");
				}
			} catch (error) {
				if (!isStopped) {
					setPositionSettingStatus("error");
					console.error("[DB-1017:highlightBubblePosition:readFailed]", error);
				}
			}
		};
		void readBubblePosition();
		const unsubscribe = ChromeSyncStorage.subscribe<"above" | "below">(
			STORAGE_KEYS.highlightBubblePosition,
			(value) => {
				setBubblePosition(value === "above" ? "above" : "below");
				setPositionSettingStatus("ready");
			},
		);

		return () => {
			isStopped = true;
			unsubscribe();
		};
	}, []);

	return {
		isBubbleAllowed:
			isLoggedIn &&
			isBubbleEnabled === true &&
			disabledSites !== null &&
			!disabledSites.includes(location.hostname),
		isIntroPending: isIntroSeen === false,
		bubblePosition,
		positionSettingStatus,
		setBubblePosition,
	};
};
