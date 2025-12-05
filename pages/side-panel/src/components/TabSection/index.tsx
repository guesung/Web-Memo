import { ErrorBoundary, Tabs, TabsContent, TabsList } from "@web-memo/ui";
import { Chat, Summary } from "..";
import { ChatProvider } from "../Chat/components";
import { SummaryProvider } from "../Summary/components";
import { ChatTabTrigger, SummaryTabTrigger } from "./components";

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
		<SummaryProvider>
			<ChatProvider>
				<section
					className="flex flex-col overflow-hidden"
					style={{ height: `${tabHeight}%` }}
				>
					<Tabs
						value={activeTab}
						onValueChange={onTabChange}
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
