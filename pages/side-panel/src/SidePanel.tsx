import { useDidMount } from "@web-memo/shared/hooks";
import {
	AnalyticsUserTracking,
	analytics,
} from "@web-memo/shared/modules/analytics";
import { claimNoticeReturns } from "@web-memo/shared/modules/chrome-storage";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { ErrorBoundary, Toaster } from "@web-memo/ui";
import { Suspense } from "react";
import { QueryProvider } from "./components";
import PageContentProvider from "./components/PageContentProvider";
import SidePanelContent from "./components/SidePanelContent";
import { reportSidePanelError } from "./utils";

export default function SidePanel() {
	useDidMount(() => {
		bridge.handle.GET_SIDE_PANEL_OPEN((_, __, sendResponse) => {
			sendResponse(true);
		});
		analytics.trackSidePanelOpen();
		analytics.trackPageView("Side Panel", window.location.href);
		void claimNoticeReturns()
			.then((returns) => {
				for (const { noticeId, daysSinceView } of returns) {
					void analytics.trackEvent({
						name: "notice_return",
						params: { notice_id: noticeId, days_since_view: daysSinceView },
					});
				}
			})
			.catch((error) => {
				reportSidePanelError({
					error,
					feature: "notice",
					operation: "claim_return",
					stage: "storage",
					level: "warning",
				});
			});
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
