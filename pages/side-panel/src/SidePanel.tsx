import { useDidMount } from "@web-memo/shared/hooks";
import {
	AnalyticsUserTracking,
	analytics,
} from "@web-memo/shared/modules/analytics";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { ErrorBoundary, Toaster } from "@web-memo/ui";
import { Suspense, useState } from "react";
import {
	MemoSection,
	QueryProvider,
	ResizeHandle,
	TabSection,
} from "./components";
import { ChatProvider } from "./components/Chat/components";
import { SummaryProvider } from "./components/Summary/components";
import { useResizablePanel } from "./hooks";

export default function SidePanel() {
	const { tabHeight, memoHeight, isResizing, containerRef, handleMouseDown } =
		useResizablePanel();
	const [activeTab, setActiveTab] = useState<string>("summary");

	useDidMount(() => {
		ExtensionBridge.responseGetSidePanelOpen();
		analytics.trackSidePanelOpen();
		analytics.trackPageView("Side Panel", window.location.href);
	});

	return (
		<QueryProvider>
			<SummaryProvider>
				<ChatProvider>
					<main
						ref={containerRef}
						className="prose prose-sm bg-background text-foreground relative flex h-lvh flex-col px-4 max-w-none overflow-x-hidden"
					>
						<TabSection
							activeTab={activeTab}
							onTabChange={setActiveTab}
							tabHeight={tabHeight}
						/>
						<ResizeHandle
							tabHeight={tabHeight}
							isResizing={isResizing}
							onMouseDown={handleMouseDown}
						/>
						<MemoSection memoHeight={memoHeight} />
					</main>
					<Toaster />
					<ErrorBoundary>
						<Suspense>
							<AnalyticsUserTracking />
						</Suspense>
					</ErrorBoundary>
				</ChatProvider>
			</SummaryProvider>
		</QueryProvider>
	);
}
