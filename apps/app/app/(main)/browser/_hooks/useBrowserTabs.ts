import { getPageKey } from "@web-memo/shared/utils/url";
import { useEffect, useState } from "react";
import {
	getBrowserTabs,
	type IFBrowserTab,
	type IFBrowserTabsState,
	saveBrowserTabs,
} from "@/lib/storage/browserTabs";
import {
	addTab,
	closeTab,
	createEmptyTab,
	createInitialTabsState,
	openUrlInTab,
	selectTab,
	updateActiveTab,
} from "../_utils/browserTabs";

/**
 * 브라우저 탭 목록과 활성 탭을 관리하고 AsyncStorage에 저장한다.
 * @description 저장본 로드가 끝나기 전(isTabsLoaded === false)에는 저장하지 않는다.
 * 로드 전 초기값이 저장본을 덮어쓰지 않게 하기 위해서다.
 */
export function useBrowserTabs() {
	const [tabsState, setTabsState] = useState<IFBrowserTabsState>(
		createInitialTabsState,
	);
	const [isTabsLoaded, setIsTabsLoaded] = useState(false);

	useEffect(() => {
		let isCancelled = false;

		const loadTabs = async () => {
			const saved = await getBrowserTabs();
			if (isCancelled) {
				return;
			}

			if (saved) {
				setTabsState(saved);
			}
			setIsTabsLoaded(true);
		};
		loadTabs();

		return () => {
			isCancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!isTabsLoaded) {
			return;
		}

		saveBrowserTabs(tabsState);
	}, [tabsState, isTabsLoaded]);

	const activeTab: IFBrowserTab =
		tabsState.tabs.find((tab) => tab.id === tabsState.activeTabId) ??
		tabsState.tabs[0];

	/** 활성 탭의 url/title을 갱신한다. 이벤트가 몰려도 앞선 갱신을 잃지 않도록 함수형으로 반영한다 */
	const updateActiveTabInfo = (
		patch: Partial<Pick<IFBrowserTab, "url" | "title">>,
	): void => {
		setTabsState((prev) => updateActiveTab(prev, patch));
	};

	/** 해당 탭을 활성화하고 갱신된 상태를 반환한다 */
	const activateTab = (tabId: string): IFBrowserTabsState => {
		const next = selectTab(tabsState, tabId);
		setTabsState(next);

		return next;
	};

	/** 빈 새 탭을 끝에 추가·활성화하고 갱신된 상태를 반환한다 */
	const openNewTab = (): IFBrowserTabsState => {
		const next = addTab(tabsState, createEmptyTab());
		setTabsState(next);

		return next;
	};

	/** 링크를 새 탭 우선으로 열고(같은 페이지 탭이 있으면 전환) 갱신된 상태를 반환한다 */
	const openUrlInNewTab = (url: string): IFBrowserTabsState => {
		const next = openUrlInTab(tabsState, url, { getKey: getPageKey });
		setTabsState(next);

		return next;
	};

	/** 탭을 닫고 갱신된 상태를 반환한다 */
	const removeTab = (tabId: string): IFBrowserTabsState => {
		const next = closeTab(tabsState, tabId);
		setTabsState(next);

		return next;
	};

	return {
		tabs: tabsState.tabs,
		activeTabId: tabsState.activeTabId,
		activeTab,
		isTabsLoaded,
		updateActiveTabInfo,
		activateTab,
		openNewTab,
		openUrlInNewTab,
		removeTab,
	};
}
