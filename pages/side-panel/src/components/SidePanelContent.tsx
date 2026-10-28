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
	const { showSummary, showAiChat } = useAiFeatureSettingsQuery();
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
	const [isSummaryEntering, setIsSummaryEntering] = useState(false);
	const isSummaryOpen =
		showSummary && summaryState.pageKey === pageKey && summaryState.isOpen;
	const isAvailable = !isLoading && !error && Boolean(content.trim());
	const isSummaryActive =
		isSummaryOpen && (!showAiChat || selectedTab === "summary");
	const hasAiTab = isSummaryOpen || showAiChat;
	const { tabHeight, isResizing, handleMouseDown, containerRef } =
		useResizablePanel(isSummaryActive);
	const animateHeight = !isResizing;
	const displayedTabHeight = isSummaryEntering ? 0 : tabHeight;

	useEffect(() => {
		if (!isSummaryEntering) return;
		const frame = requestAnimationFrame(() => setIsSummaryEntering(false));
		return () => cancelAnimationFrame(frame);
	}, [isSummaryEntering]);

	useEffect(() => {
		setPendingOpenPageKey(null);
		setSummaryState({ pageKey, isOpen: false });
		setSelectedTab("chat");
	}, [pageKey]);

	useEffect(() => {
		if (showSummary) return;
		setPendingOpenPageKey(null);
		setSummaryState({ pageKey, isOpen: false });
		setSelectedTab("chat");
	}, [showSummary, pageKey]);

	useEffect(() => {
		if (
			showSummary &&
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
		showSummary,
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
		if (!showSummary) return;
		setIsSummaryEntering(
			!isSummaryOpen &&
				!showAiChat &&
				!window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		);
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
			{showSummary && (
				<SummaryDisclosure
					isOpen={isSummaryOpen}
					onToggle={handleSummaryToggle}
				/>
			)}
			{showSummary && !isSummaryOpen && <span id={SUMMARY_PANEL_ID} hidden />}
			<div ref={containerRef} className="relative flex min-h-0 flex-1 flex-col">
				{hasAiTab && (
					<>
						<TabSection
							tabHeight={displayedTabHeight}
							animateHeight={animateHeight}
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
							className={`absolute inset-x-0 z-10 -translate-y-1/2 ${animateHeight ? "transition-[top] duration-[180ms] ease-out motion-reduce:transition-none" : ""}`}
							style={{ top: `${displayedTabHeight}%` }}
						>
							<ResizeHandle
								upperSectionRatio={tabHeight}
								isResizing={isResizing}
								onMouseDown={handleMouseDown}
							/>
						</div>
					</>
				)}
				<MemoSection
					memoHeight={hasAiTab ? 100 - displayedTabHeight : 100}
					animateHeight={animateHeight}
				/>
			</div>
		</main>
	);
}
