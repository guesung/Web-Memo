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

/**
 * 링크를 새 탭 우선으로 연다.
 * @description 같은 페이지(getPageKey 일치)의 탭이 있으면 그 탭으로 전환하고, 없으면 활성 탭이
 * 빈 새 탭일 때 그 탭에 url을 연다. 그 외에는 url을 담은 새 탭을 끝에 추가·활성화한다.
 * 빈 url 탭은 같은 페이지 비교에서 제외한다.
 */
export function openUrlInTab(
	state: IFBrowserTabsState,
	url: string,
	{ getKey, newTabId }: { getKey: (url: string) => string; newTabId?: string },
): IFBrowserTabsState {
	const targetKey = getKey(url);
	const samePageTab = state.tabs.find(
		(tab) => tab.url !== "" && getKey(tab.url) === targetKey,
	);
	if (samePageTab) {
		return selectTab(state, samePageTab.id);
	}

	const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
	if (activeTab?.url === "") {
		return updateActiveTab(state, { url, title: "" });
	}

	return addTab(state, { ...createEmptyTab(newTabId), url });
}
