import { ErrorBoundary, Tabs, TabsContent, TabsList } from "@web-memo/ui";
import { Chat, Summary } from "..";
import { ChatTabTrigger, GlobalHeader, SummaryTabTrigger } from "./components";

interface TabSectionProps {
	activeTab: string;
	onTabChange: (value: string) => void;
	tabHeight: number;
}

export default function TabSection({
	activeTab,
	onTabChange,
	tabHeight,
}: TabSectionProps) {
	return (
		<section
			className="flex flex-col overflow-hidden"
			style={{ height: `${tabHeight}%` }}
		>
			<GlobalHeader />
			<Tabs
				value={activeTab}
				onValueChange={onTabChange}
				className="flex flex-col flex-1 min-h-0 overflow-hidden"
			>
				<TabsList className="shrink-0 mt-3 w-full grid grid-cols-2">
					<SummaryTabTrigger />
					<ChatTabTrigger />
				</TabsList>

				<TabsContent value="summary" className="flex-1 overflow-y-auto mt-0">
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
	);
}
