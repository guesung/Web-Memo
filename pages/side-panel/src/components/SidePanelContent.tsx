import { Header, MemoSection, ResizeHandle, TabSection } from "@src/components";
import { useResizablePanel } from "@src/hooks";
import {
	useAiFeatureSettingsQuery,
	useDidMount,
	useTabQuery,
} from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { useEffect, useState } from "react";
import { usePageContentContext } from "./PageContentProvider";
import SummaryDisclosure, { SUMMARY_PANEL_ID } from "./SummaryDisclosure";
import { SummaryProvider } from "./TabSection/components/Summary/components";
import { useSummaryContext } from "./TabSection/components/Summary/components/SummaryProvider";
import type { TTabName } from "./TabSection/resolveActiveTab";

export default function SidePanelContent() {
	return (
		<SummaryProvider>
			<SidePanelBody />
		</SummaryProvider>
	);
}

function SidePanelBody() {
	const { pageKey, content, isLoading, error } = usePageContentContext();
	const { refetch: refetchTab } = useTabQuery();
	const { showAiChat } = useAiFeatureSettingsQuery();
	const {
		generateSummary,
		hasRequestedSummary,
		isAuthenticated,
		isAuthPending,
	} = useSummaryContext();
	const [pendingOpenPageKey, setPendingOpenPageKey] = useState<string | null>(
		null,
	);
	const [summaryState, setSummaryState] = useState({ pageKey, isOpen: false });
	const [selectedTab, setSelectedTab] = useState<TTabName>("chat");
	const isSummaryOpen = summaryState.pageKey === pageKey && summaryState.isOpen;
	const isAvailable = !isLoading && !error && Boolean(content.trim());
	const isSummaryActive =
		isSummaryOpen && (!showAiChat || selectedTab === "summary");
	const hasAiTab = isSummaryOpen || showAiChat;
	const { tabHeight, memoHeight, isResizing, handleMouseDown, containerRef } =
		useResizablePanel(isSummaryActive);

	useEffect(() => {
		setPendingOpenPageKey(null);
		setSummaryState({ pageKey, isOpen: false });
		setSelectedTab("chat");
	}, [pageKey]);

	useEffect(() => {
		if (
			!isLoading &&
			(!isAvailable || !isAuthPending) &&
			pendingOpenPageKey === pageKey
		) {
			setPendingOpenPageKey(null);
			if (
				isSummaryOpen &&
				isAvailable &&
				isAuthenticated &&
				!hasRequestedSummary
			) {
				void generateSummary("disclosure");
			}
		}
	}, [
		pageKey,
		pendingOpenPageKey,
		isLoading,
		isAuthPending,
		isSummaryOpen,
		isAvailable,
		isAuthenticated,
		hasRequestedSummary,
		generateSummary,
	]);

	useDidMount(() => {
		bridge.handle.UPDATE_SIDE_PANEL(() => {
			void refetchTab();
		});
	});

	const handleSummaryToggle = () => {
		const action = isSummaryOpen ? "close" : "open";
		analytics.trackEvent({ name: "summary_panel_toggle", params: { action } });
		setSummaryState({ pageKey, isOpen: !isSummaryOpen });
		setSelectedTab(isSummaryOpen ? "chat" : "summary");

		if (isSummaryOpen) {
			setPendingOpenPageKey(null);
		} else if (isLoading || isAuthPending) {
			setPendingOpenPageKey(pageKey);
		} else if (isAvailable && isAuthenticated && !hasRequestedSummary) {
			void generateSummary("disclosure");
		}
	};

	const handleTabChange = (tab: TTabName) => {
		setSelectedTab(tab);
		if (tab === "chat") setSummaryState({ pageKey, isOpen: false });
	};

	return (
		<main className="relative flex h-lvh max-w-none flex-col overflow-x-hidden bg-background px-4 text-foreground">
			<Header />
			<SummaryDisclosure
				isOpen={isSummaryOpen}
				onToggle={handleSummaryToggle}
			/>
			{!isSummaryOpen && <span id={SUMMARY_PANEL_ID} hidden />}
			<div ref={containerRef} className="relative flex min-h-0 flex-1 flex-col">
				{hasAiTab && (
					<>
						<TabSection
							tabHeight={tabHeight}
							isSummaryOpen={isSummaryOpen}
							isChatEnabled={showAiChat}
							selectedTab={selectedTab}
							onTabChange={handleTabChange}
							panelId={SUMMARY_PANEL_ID}
							isAwaitingSummary={
								isSummaryOpen && pendingOpenPageKey === pageKey
							}
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
	);
}
