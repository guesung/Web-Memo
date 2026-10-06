import { analytics } from "@web-memo/shared/modules/analytics";
import { cn, ErrorBoundary, Tabs, TabsContent, TabsList } from "@web-memo/ui";
import { useState } from "react";
import { ChatTabTrigger, SummaryTabTrigger } from "./components";
import Chat from "./components/Chat";
import { ChatProvider } from "./components/Chat/components";
import Summary from "./components/Summary";
import { SummaryProvider } from "./components/Summary/components";
import { resolveActiveTab, type TTabName } from "./resolveActiveTab";

interface TabSectionProps {
	tabHeight: number;
	/** 요약 탭을 보여줄지. 둘 다 꺼진 경우는 호출부가 TabSection을 그리지 않는다 */
	isSummaryEnabled: boolean;
	/** AI 채팅 탭을 보여줄지 */
	isChatEnabled: boolean;
}

export default function TabSection({
	tabHeight,
	isSummaryEnabled,
	isChatEnabled,
}: TabSectionProps) {
	const [selectedTab, setSelectedTab] = useState<TTabName>("summary");
	// 선택한 탭이 꺼지면(열려 있는 동안 옵션에서 변경) 켜진 탭으로 넘어간다.
	const activeTab = resolveActiveTab({
		selectedTab,
		isSummaryEnabled,
		isChatEnabled,
	});
	const hasBothTabs = isSummaryEnabled && isChatEnabled;

	const handleTabChange = (tabName: string) => {
		setSelectedTab(tabName as TTabName);
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
						<TabsList
							className={cn(
								"shrink-0 mt-3 w-full grid",
								hasBothTabs ? "grid-cols-2" : "grid-cols-1",
							)}
						>
							{isSummaryEnabled && <SummaryTabTrigger />}
							{isChatEnabled && <ChatTabTrigger />}
						</TabsList>
						{isSummaryEnabled && (
							<TabsContent
								value="summary"
								className="flex-1 overflow-y-auto mt-0"
							>
								<ErrorBoundary>
									<Summary />
								</ErrorBoundary>
							</TabsContent>
						)}

						{isChatEnabled && (
							<TabsContent
								value="chat"
								// 채팅 입력창도 같은 이유로 포커스 링이 좌우로 잘린다
								className="flex-1 overflow-hidden mt-0 px-0.5"
							>
								<ErrorBoundary>
									<Chat />
								</ErrorBoundary>
							</TabsContent>
						)}
					</Tabs>
				</section>
			</ChatProvider>
		</SummaryProvider>
	);
}
