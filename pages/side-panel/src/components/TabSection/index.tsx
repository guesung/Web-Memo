import { analytics } from "@web-memo/shared/modules/analytics";
import { ErrorBoundary, Tabs, TabsContent, TabsList } from "@web-memo/ui";
import { ChatTabTrigger } from "./components";
import Chat from "./components/Chat";
import { ChatProvider } from "./components/Chat/components";
import Summary from "./components/Summary";
import { resolveActiveTab, type TTabName } from "./resolveActiveTab";

interface TabSectionProps {
	tabHeight: number;
	isSummaryOpen: boolean;
	isChatEnabled: boolean;
	selectedTab: TTabName;
	onTabChange: (tab: TTabName) => void;
	panelId: string;
	isAwaitingSummary: boolean;
}

export default function TabSection({
	tabHeight,
	isSummaryOpen,
	isChatEnabled,
	selectedTab,
	onTabChange,
	panelId,
	isAwaitingSummary,
}: TabSectionProps) {
	const activeTab = resolveActiveTab({
		selectedTab,
		isSummaryOpen,
		isChatEnabled,
	});
	if (!activeTab) return null;

	const handleTabChange = (tabName: string) => {
		onTabChange(tabName as TTabName);
		analytics.trackEvent({ name: "tab_change", params: { tab_name: tabName } });
	};

	return (
		<ChatProvider>
			<section
				className="flex min-h-0 flex-col overflow-hidden"
				style={{ height: `${tabHeight}%` }}
			>
				<Tabs
					value={activeTab}
					onValueChange={handleTabChange}
					className="flex min-h-0 flex-1 flex-col overflow-hidden"
				>
					{!isSummaryOpen && isChatEnabled && (
						<TabsList className="mt-3 grid w-full shrink-0 grid-cols-1">
							<ChatTabTrigger />
						</TabsList>
					)}
					{isSummaryOpen && (
						<TabsContent
							id={panelId}
							value="summary"
							className="mt-0 min-h-0 flex-1 overflow-y-auto"
						>
							<ErrorBoundary>
								<Summary isAwaitingSummary={isAwaitingSummary} />
							</ErrorBoundary>
						</TabsContent>
					)}
					{isChatEnabled && (
						<TabsContent
							value="chat"
							className="mt-0 min-h-0 flex-1 overflow-hidden px-0.5"
						>
							<ErrorBoundary>
								<Chat />
							</ErrorBoundary>
						</TabsContent>
					)}
				</Tabs>
			</section>
		</ChatProvider>
	);
}
