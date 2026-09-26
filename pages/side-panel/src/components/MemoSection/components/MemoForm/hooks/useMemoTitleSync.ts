import { Tab } from "@web-memo/shared/utils/extension";
import { useEffect, useRef, useState } from "react";

/** 제목 입력과 현재 페이지 제목의 연동에 필요한 콜백입니다. */
interface IFMemoTitleSyncOptions {
	onTitleUpdate: (title: string) => void;
	initialSavedTitle?: string;
	memoId?: number;
	/** 메모 조회가 끝났는지. false인 동안의 memoId는 "메모 없음"이 아니라 "아직 모름"이다. 생략하면 끝난 것으로 본다. */
	isMemoResolved?: boolean;
	pageUrl?: string;
	pageTitle?: string;
}

/** 페이지 제목을 최신 탭 조회 순서로 반영하며 직접 입력한 제목은 보존합니다. */
export const useMemoTitleSync = (options: IFMemoTitleSyncOptions) => {
	const onTitleUpdateRef = useRef(options.onTitleUpdate);
	onTitleUpdateRef.current = options.onTitleUpdate;
	const isManualTitleRef = useRef(false);
	const initialSavedTitleRef = useRef(options.initialSavedTitle);
	const initializedMemoIdRef = useRef(options.memoId);
	const initializedPageUrlRef = useRef(options.pageUrl);
	const hasLoadedInitialTitleRef = useRef(false);
	const isAwaitingMemoRef = useRef(false);
	const requestVersionRef = useRef(0);
	const [isTitleSyncAvailable, setIsTitleSyncAvailable] = useState(false);

	useEffect(() => {
		// 조회 대기 중에는 memoId가 비어 있어도 "메모 없음"이 아니다. 도착했을 때 저장 제목을
		// 적용하도록 표시만 해 둔다. 새 페이지로 옮겼으면 이전 페이지의 저장 제목이 남지 않게
		// 수동 표시를 풀고 탭 제목을 보여 준다.
		if (options.isMemoResolved === false) {
			isAwaitingMemoRef.current = true;
			if (initializedPageUrlRef.current === options.pageUrl) {
				return;
			}

			initializedPageUrlRef.current = options.pageUrl;
			initializedMemoIdRef.current = undefined;
			isManualTitleRef.current = false;
			++requestVersionRef.current;
			if (options.pageTitle !== undefined) {
				onTitleUpdateRef.current(options.pageTitle);
			}
			return;
		}

		if (isAwaitingMemoRef.current) {
			isAwaitingMemoRef.current = false;
			initializedMemoIdRef.current = options.memoId;
			initializedPageUrlRef.current = options.pageUrl;
			hasLoadedInitialTitleRef.current = true;
			if (options.memoId === undefined) {
				return;
			}

			++requestVersionRef.current;
			initialSavedTitleRef.current = options.initialSavedTitle;
			isManualTitleRef.current =
				options.initialSavedTitle !== options.pageTitle;
			onTitleUpdateRef.current(options.initialSavedTitle ?? "");
			return;
		}

		if (initializedMemoIdRef.current === options.memoId) {
			return;
		}

		const isCurrentPageFirstSave =
			initializedMemoIdRef.current === undefined &&
			initializedPageUrlRef.current === options.pageUrl;
		initializedMemoIdRef.current = options.memoId;
		initializedPageUrlRef.current = options.pageUrl;
		if (isCurrentPageFirstSave) {
			return;
		}
		++requestVersionRef.current;
		if (options.memoId !== undefined) {
			initialSavedTitleRef.current = options.initialSavedTitle;
			hasLoadedInitialTitleRef.current = true;
			isManualTitleRef.current =
				options.initialSavedTitle !== options.pageTitle;
			onTitleUpdateRef.current(options.initialSavedTitle ?? "");
		}
	}, [
		options.memoId,
		options.isMemoResolved,
		options.initialSavedTitle,
		options.pageUrl,
		options.pageTitle,
	]);

	useEffect(() => {
		const refreshTitle = async () => {
			const requestVersion = ++requestVersionRef.current;

			try {
				const currentTab = await Tab.get();
				if (requestVersion !== requestVersionRef.current) {
					return;
				}

				if (!hasLoadedInitialTitleRef.current) {
					hasLoadedInitialTitleRef.current = true;
					if (
						initialSavedTitleRef.current &&
						initialSavedTitleRef.current !== currentTab?.title &&
						!isManualTitleRef.current
					) {
						isManualTitleRef.current = true;
						onTitleUpdateRef.current(initialSavedTitleRef.current);
					}
				}

				setIsTitleSyncAvailable(Boolean(currentTab?.title));
				if (!isManualTitleRef.current && currentTab?.title !== undefined) {
					onTitleUpdateRef.current(currentTab.title);
				}
			} catch {
				if (requestVersion === requestVersionRef.current) {
					setIsTitleSyncAvailable(false);
				}
			}
		};

		chrome.tabs.onActivated.addListener(refreshTitle);
		chrome.tabs.onUpdated.addListener(refreshTitle);
		void refreshTitle();

		return () => {
			++requestVersionRef.current;
			chrome.tabs.onActivated.removeListener(refreshTitle);
			chrome.tabs.onUpdated.removeListener(refreshTitle);
		};
	}, []);

	const handleTitleInputChange = (title: string) => {
		++requestVersionRef.current;
		isManualTitleRef.current = true;
		onTitleUpdateRef.current(title);
	};

	const handleTitleSyncClick = async () => {
		const requestVersion = ++requestVersionRef.current;

		try {
			const currentTab = await Tab.get();
			if (
				requestVersion !== requestVersionRef.current ||
				currentTab?.title === undefined
			) {
				return undefined;
			}

			isManualTitleRef.current = false;
			onTitleUpdateRef.current(currentTab.title);

			return currentTab;
		} catch {
			if (requestVersion === requestVersionRef.current) {
				setIsTitleSyncAvailable(false);
			}
		}

		return undefined;
	};

	return { isTitleSyncAvailable, handleTitleInputChange, handleTitleSyncClick };
};
