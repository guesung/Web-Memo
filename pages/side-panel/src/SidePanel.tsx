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
import { SummaryProvider } from "./components/Summary/components";
import { useResizablePanel } from "./hooks";

export default function SidePanel() {
	const {
		summaryHeight,
		memoHeight,
		isResizing,
		containerRef,
		handleMouseDown,
	} = useResizablePanel();
	const [activeTab, setActiveTab] = useState<string>("summary");

	useDidMount(() => {
		ExtensionBridge.responseGetSidePanelOpen();
		analytics.trackSidePanelOpen();
		analytics.trackPageView("Side Panel", window.location.href);
	});

	return (
		<QueryProvider>
			<SummaryProvider>
				<main
					ref={containerRef}
					className="prose prose-sm bg-background text-foreground relative flex h-lvh flex-col px-4 max-w-none overflow-x-hidden"
				>
					<TabSection
						activeTab={activeTab}
						onTabChange={setActiveTab}
						height={summaryHeight}
					/>
					<ResizeHandle
						summaryHeight={summaryHeight}
						isResizing={isResizing}
						onMouseDown={handleMouseDown}
					/>
					<MemoSection height={memoHeight} />
				</main>
				<Toaster />
				<ErrorBoundary>
					<Suspense>
						<AnalyticsUserTracking />
					</Suspense>
				</ErrorBoundary>
			</SummaryProvider>
		</QueryProvider>
	);
}
