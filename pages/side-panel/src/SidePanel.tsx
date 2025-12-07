import { useDidMount } from "@web-memo/shared/hooks";
import {
	AnalyticsUserTracking,
	analytics,
} from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { ErrorBoundary, Toaster } from "@web-memo/ui";
import { Suspense } from "react";
import { QueryProvider } from "./components";
import SidePanelContent from "./components/SidePanelContent";
import { PageContentProvider } from "./components/TabSection/components";

export default function SidePanel() {
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
				<SidePanelContent />

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
