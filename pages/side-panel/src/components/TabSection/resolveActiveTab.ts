export type TTabName = "summary" | "chat";

interface ResolveActiveTabOptions {
	selectedTab: TTabName;
	isSummaryOpen: boolean;
	isChatEnabled: boolean;
}

export function resolveActiveTab({
	selectedTab,
	isSummaryOpen,
	isChatEnabled,
}: ResolveActiveTabOptions): TTabName | null {
	if (isSummaryOpen && selectedTab === "summary") return "summary";
	if (isChatEnabled) return "chat";
	if (isSummaryOpen) return "summary";
	return null;
}
