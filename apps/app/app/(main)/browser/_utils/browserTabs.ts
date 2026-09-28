import type {
	IFBrowserTab,
	IFBrowserTabsState,
} from "@/lib/storage/browserTabs";

/** 새 탭의 id를 만든다 */
function createTabId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 빈 새 탭(시작 화면)을 만든다 */
export function createEmptyTab(id: string = createTabId()): IFBrowserTab {
	return { id, url: "", title: "" };
}

/** 빈 새 탭 하나만 있는 초기 상태를 만든다 */
export function createInitialTabsState(): IFBrowserTabsState {
	const tab = createEmptyTab();

	return { tabs: [tab], activeTabId: tab.id };
}

/** 탭을 목록 끝에 추가하고 활성화한다 */
export function addTab(
	state: IFBrowserTabsState,
	tab: IFBrowserTab,
): IFBrowserTabsState {
	return { tabs: [...state.tabs, tab], activeTabId: tab.id };
}

/** 해당 탭을 활성화한다. 없는 id면 상태를 그대로 돌려준다 */
export function selectTab(
	state: IFBrowserTabsState,
	tabId: string,
): IFBrowserTabsState {
	if (!state.tabs.some((tab) => tab.id === tabId)) {
		return state;
	}

	return { ...state, activeTabId: tabId };
}

/**
 * 탭을 닫는다.
 * @description 활성 탭을 닫으면 바로 다음 탭(없으면 이전 탭)이 활성화된다.
 * 마지막 탭을 닫으면 fallbackTab 하나가 남는다.
 */
export function closeTab(
	state: IFBrowserTabsState,
	tabId: string,
	fallbackTab: IFBrowserTab = createEmptyTab(),
): IFBrowserTabsState {
	const closedIndex = state.tabs.findIndex((tab) => tab.id === tabId);
	if (closedIndex === -1) {
		return state;
	}

	const remainingTabs = state.tabs.filter((tab) => tab.id !== tabId);
	if (remainingTabs.length === 0) {
		return { tabs: [fallbackTab], activeTabId: fallbackTab.id };
	}

	if (tabId !== state.activeTabId) {
		return { ...state, tabs: remainingTabs };
	}

	const nextActiveTab =
		remainingTabs[closedIndex] ?? remainingTabs[closedIndex - 1];

	return { tabs: remainingTabs, activeTabId: nextActiveTab.id };
}

/** 활성 탭의 url/title을 갱신한다 */
export function updateActiveTab(
	state: IFBrowserTabsState,
	patch: Partial<Pick<IFBrowserTab, "url" | "title">>,
): IFBrowserTabsState {
	return {
		...state,
		tabs: state.tabs.map((tab) =>
			tab.id === state.activeTabId ? { ...tab, ...patch } : tab,
		),
	};
}
