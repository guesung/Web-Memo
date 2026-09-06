import { analytics } from "@web-memo/shared/modules/analytics";
import { ErrorBoundary, Tabs, TabsContent, TabsList } from "@web-memo/ui";
import { useState } from "react";
import { ChatTabTrigger, SummaryTabTrigger } from "./components";
import Chat from "./components/Chat";
import { ChatProvider } from "./components/Chat/components";
import Summary from "./components/Summary";
import { SummaryProvider } from "./components/Summary/components";

interface TabSectionProps {
	tabHeight: number;
}

export default function TabSection({ tabHeight }: TabSectionProps) {
	const [activeTab, setActiveTab] = useState("summary");

	const handleTabChange = (tabName: string) => {
		setActiveTab(tabName);
		analytics.trackEvent({ name: "tab_change", params: { tab_name: tabName } });
	};

	return (
		<SummaryProvider>
			<ChatProvider>
				<section
					className="flex flex-col overflow-hidden"
					style={{ height: `${tabHeight}%` }}
				>
					<Tabs
						value={activeTab}
						onValueChange={handleTabChange}
						className="flex flex-col flex-1 min-h-0 overflow-hidden"
					>
						<TabsList className="shrink-0 mt-3 w-full grid grid-cols-2">
							<SummaryTabTrigger />
							<ChatTabTrigger />
						</TabsList>
						<TabsContent
							value="summary"
							className="flex-1 overflow-y-auto mt-0"
						>
							<ErrorBoundary>
								<Summary />
							</ErrorBoundary>
						</TabsContent>

						<TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
							<ErrorBoundary>
								<Chat />
							</ErrorBoundary>
						</TabsContent>
					</Tabs>
				</section>
			</ChatProvider>
		</SummaryProvider>
	);
}
