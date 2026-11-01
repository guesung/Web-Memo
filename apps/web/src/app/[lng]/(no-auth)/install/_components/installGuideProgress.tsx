"use client";

import { bridge } from "@web-memo/shared/modules/extension-bridge";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

/** 패널이 열렸는지 확인하는 간격. 툴바 아이콘·Alt+S처럼 버튼 밖에서 연 경우를 잡는다. */
const PANEL_OPEN_POLL_MS = 1_000;

interface IFInstallGuideProgress {
	isPanelOpen: boolean;
	markPanelOpen: () => void;
}

const InstallGuideProgressContext = createContext<IFInstallGuideProgress>({
	isPanelOpen: false,
	markPanelOpen: () => {},
});

/**
 * 설치 가이드에서 사이드 패널이 열렸는지 공유한다.
 * @description 버튼으로 열면 응답을 받는 즉시, 다른 방법으로 열면 주기 확인으로 알아챈다.
 * 웹 가이드(useGuide)와 같이 패널이 GET_SIDE_PANEL_OPEN에 답하는지로 본다. 한 번 열린 뒤에는 확인을 멈춘다.
 */
export function InstallGuideProgressProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [isPanelOpen, setIsPanelOpen] = useState(false);
	const markPanelOpen = useCallback(() => setIsPanelOpen(true), []);

	useEffect(() => {
		if (isPanelOpen) return;

		const intervalId = setInterval(() => {
			bridge.request
				.GET_SIDE_PANEL_OPEN()
				.then((isOpen) => {
					if (isOpen === true) setIsPanelOpen(true);
				})
				.catch(() => {
					// 패널이 닫혀 있으면 받을 쪽이 없어 거부된다. 다음 주기에 다시 확인한다.
				});
		}, PANEL_OPEN_POLL_MS);

		return () => clearInterval(intervalId);
	}, [isPanelOpen]);

	const value = useMemo(
		() => ({ isPanelOpen, markPanelOpen }),
		[isPanelOpen, markPanelOpen],
	);

	return (
		<InstallGuideProgressContext.Provider value={value}>
			{children}
		</InstallGuideProgressContext.Provider>
	);
}

export const useInstallGuideProgress = () =>
	useContext(InstallGuideProgressContext);
