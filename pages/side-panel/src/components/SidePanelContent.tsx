import { Header, MemoSection, ResizeHandle, TabSection } from "@src/components";
import { useResizablePanel } from "@src/hooks";
import {
	useAiFeatureSettingsQuery,
	useDidMount,
	useTabQuery,
} from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { useState } from "react";
import { usePageContentContext } from "./PageContentProvider";
import SummaryDisclosure, { SUMMARY_PANEL_ID } from "./SummaryDisclosure";
import { SummaryProvider } from "./TabSection/components/Summary/components";
import type { TTabName } from "./TabSection/resolveActiveTab";

export default function SidePanelContent() {
	const { pageKey, content, isLoading, error } = usePageContentContext();
	const { refetch: refetchTab } = useTabQuery();
	const { showAiChat } = useAiFeatureSettingsQuery();
	const [summaryState, setSummaryState] = useState({ pageKey, isOpen: false });
	const [selectedTab, setSelectedTab] = useState<TTabName>("chat");
	const isSummaryOpen = summaryState.pageKey === pageKey && summaryState.isOpen;
	const isAvailable = !isLoading && !error && Boolean(content.trim());
	const isSummaryActive =
		isSummaryOpen && (!showAiChat || selectedTab === "summary");
	const hasAiTab = isSummaryOpen || showAiChat;
	const { tabHeight, memoHeight, isResizing, handleMouseDown, containerRef } =
		useResizablePanel(isSummaryActive);

	useDidMount(() => {
		bridge.handle.UPDATE_SIDE_PANEL(() => {
			void refetchTab();
		});
	});

	const handleSummaryToggle = () => {
		setSummaryState({ pageKey, isOpen: !isSummaryOpen });
		setSelectedTab(isSummaryOpen ? "chat" : "summary");
	};

	const handleTabChange = (tab: TTabName) => {
		setSelectedTab(tab);
		if (tab === "chat") setSummaryState({ pageKey, isOpen: false });
	};

	return (
		<SummaryProvider>
			<main className="relative flex h-lvh max-w-none flex-col overflow-x-hidden bg-background px-4 text-foreground">
				<Header />
				<SummaryDisclosure
					isOpen={isSummaryOpen}
					onToggle={handleSummaryToggle}
					isLoading={isLoading}
					isAvailable={isAvailable}
				/>
				<div
					ref={containerRef}
					className="relative flex min-h-0 flex-1 flex-col"
				>
					{hasAiTab && (
						<>
							<TabSection
								tabHeight={tabHeight}
								isSummaryOpen={isSummaryOpen}
								isChatEnabled={showAiChat}
								selectedTab={selectedTab}
								onTabChange={handleTabChange}
								panelId={SUMMARY_PANEL_ID}
							/>
							<div
								className="absolute inset-x-0 z-10 -translate-y-1/2"
								style={{ top: `${tabHeight}%` }}
							>
								<ResizeHandle
									upperSectionRatio={tabHeight}
									isResizing={isResizing}
									onMouseDown={handleMouseDown}
								/>
							</div>
						</>
					)}
					<MemoSection memoHeight={hasAiTab ? memoHeight : 100} />
				</div>
			</main>
		</SummaryProvider>
	);
}
