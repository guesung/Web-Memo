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

	return (
		<SummaryProvider>
			<ChatProvider>
				<section
					className="flex flex-col overflow-hidden"
					style={{ height: `${tabHeight}%` }}
				>
					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
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

						<TabsContent
							value="chat"
							// 채팅 입력창도 같은 이유로 포커스 링이 좌우로 잘린다
							className="flex-1 overflow-hidden mt-0 px-0.5"
						>
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
