import { Tab } from "@web-memo/shared/utils/extension";
import { useEffect, useRef, useState } from "react";

/** 제목 입력과 현재 페이지 제목의 연동에 필요한 콜백입니다. */
interface IFMemoTitleSyncOptions {
	onTitleUpdate: (title: string) => void;
	initialSavedTitle?: string;
	memoId?: number;
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
	const requestVersionRef = useRef(0);
	const [isTitleSyncAvailable, setIsTitleSyncAvailable] = useState(false);

	useEffect(() => {
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
