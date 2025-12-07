import { useDidMount } from "@web-memo/shared/hooks";
import {
	AnalyticsUserTracking,
	analytics,
} from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { ErrorBoundary, Toaster } from "@web-memo/ui";
import { Suspense } from "react";
import {
	Header,
	MemoSection,
	QueryProvider,
	ResizeHandle,
	TabSection,
} from "./components";
import { PageContentProvider } from "./components/TabSection/components";
import { useResizablePanel } from "./hooks";

export default function SidePanel() {
	const { tabHeight, memoHeight, isResizing, containerRef, handleMouseDown } =
		useResizablePanel();

	useDidMount(() => {
		bridge.handle.GET_SIDE_PANEL_OPEN((_, __, sendResponse) => {
			sendResponse(true);
		});
		analytics.trackSidePanelOpen();
		analytics.trackPageView("Side Panel", window.location.href);
	});

	return (
		<QueryProvider>
			<PageContentProvider>
				<main
					ref={containerRef}
					className="prose prose-sm bg-background text-foreground relative flex h-lvh flex-col px-4 max-w-none overflow-x-hidden"
				>
					<Header />
					<TabSection tabHeight={tabHeight} />
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
			</PageContentProvider>
		</QueryProvider>
	);
}
