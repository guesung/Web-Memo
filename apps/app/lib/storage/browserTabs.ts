import AsyncStorage from "@react-native-async-storage/async-storage";

const BROWSER_TABS_KEY = "webmemo:browser-tabs";

/** 브라우저 탭 하나. url이 빈 문자열이면 새 탭(시작 화면)이다 */
export interface IFBrowserTab {
	id: string;
	url: string;
	title: string;
}

/** 열린 탭 목록과 활성 탭 */
export interface IFBrowserTabsState {
	tabs: IFBrowserTab[];
	activeTabId: string;
}

/** 저장된 탭 상태를 반환한다. 저장본이 없거나 깨졌으면 null */
export async function getBrowserTabs(): Promise<IFBrowserTabsState | null> {
	try {
		const value = await AsyncStorage.getItem(BROWSER_TABS_KEY);
		if (!value) {
			return null;
		}

		return parseBrowserTabs(JSON.parse(value));
	} catch {
		return null;
	}
}

/** 탭 상태를 저장한다 */
export async function saveBrowserTabs(
	state: IFBrowserTabsState,
): Promise<void> {
	try {
		await AsyncStorage.setItem(BROWSER_TABS_KEY, JSON.stringify(state));
	} catch {}
}

/** 저장된 값이 탭 상태 형태가 아니면 null. 활성 탭 id가 목록에 없으면 첫 탭을 활성으로 본다 */
function parseBrowserTabs(value: unknown): IFBrowserTabsState | null {
	if (typeof value !== "object" || value === null) {
		return null;
	}

	const { tabs, activeTabId } = value as Partial<IFBrowserTabsState>;
	if (!Array.isArray(tabs) || tabs.length === 0) {
		return null;
	}

	const isValidTabs = tabs.every(
		(tab) =>
			typeof tab?.id === "string" &&
			typeof tab.url === "string" &&
			typeof tab.title === "string",
	);
	if (!isValidTabs) {
		return null;
	}

	const hasActiveTab = tabs.some((tab) => tab.id === activeTabId);

	return {
		tabs,
		activeTabId: hasActiveTab ? (activeTabId as string) : tabs[0].id,
	};
}
