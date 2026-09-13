import { analytics } from "@web-memo/shared/modules/analytics";
import { ErrorBoundary, Tabs, TabsContent, TabsList } from "@web-memo/ui";
import { useState } from "react";
import { BillingNotice } from "../BillingNotice";
import { ChatTabTrigger, SummaryTabTrigger } from "./components";
import Chat from "./components/Chat";
import { ChatProvider } from "./components/Chat/components";
import Summary from "./components/Summary";
import { SummaryProvider } from "./components/Summary/components";

/** 화면에 전달하는 속성입니다. */
interface IFTabSectionProps {
	tabHeight: number;
}

/** 기존 화면 구조와 접근성을 유지하는 컴포넌트입니다. */
const TabSection = ({ tabHeight }: IFTabSectionProps) => {
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
					<BillingNotice />
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
};

export default TabSection;
