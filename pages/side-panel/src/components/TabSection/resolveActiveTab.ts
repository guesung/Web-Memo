export type TTabName = "summary" | "chat";

interface IFResolveActiveTabOptions {
	selectedTab: TTabName;
	isSummaryEnabled: boolean;
	isChatEnabled: boolean;
}

/**
 * 지금 보여 줄 탭을 정한다.
 * @description 사용자가 고른 탭이 꺼져 있으면 켜진 탭으로 넘어간다. 둘 다 꺼진 경우는 호출부가 TabSection을 그리지 않는다.
 */
export function resolveActiveTab({
	selectedTab,
	isSummaryEnabled,
	isChatEnabled,
}: IFResolveActiveTabOptions): TTabName {
	const isSelectedTabEnabled =
		selectedTab === "summary" ? isSummaryEnabled : isChatEnabled;
	if (isSelectedTabEnabled) {
		return selectedTab;
	}

	return isSummaryEnabled ? "summary" : "chat";
}
