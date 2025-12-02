import { useDidMount } from "@web-memo/shared/hooks";
import {
	AnalyticsUserTracking,
	analytics,
} from "@web-memo/shared/modules/analytics";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { ErrorBoundary, Toaster } from "@web-memo/ui";
import { Suspense } from "react";
import {
	MemoForm,
	MemoFormSkeleton,
	MemoHeader,
	QueryProvider,
	Summary,
	UpdateNotificationDialog,
} from "./components";

export default function SidePanel() {
	useDidMount(() => {
		ExtensionBridge.responseGetSidePanelOpen();
		analytics.trackSidePanelOpen();
		analytics.trackPageView("Side Panel", window.location.href);
	});

	return (
		<QueryProvider>
			<main className="prose prose-sm bg-background text-foreground relative flex h-lvh flex-col px-4 max-w-none overflow-x-hidden">
				<section className="flex-1 overflow-y-scroll">
					<ErrorBoundary>
						<Summary />
					</ErrorBoundary>
				</section>
				<section className="flex h-1/2 flex-col">
					<MemoHeader />
					<ErrorBoundary>
						<Suspense fallback={<MemoFormSkeleton />}>
							<MemoForm />
						</Suspense>
					</ErrorBoundary>
				</section>
			</main>
			<Toaster />
			<Suspense>
				<AnalyticsUserTracking />
			</Suspense>
			<UpdateNotificationDialog />
			{/* <ReactQueryDevtools initialIsOpen={false} /> */}
		</QueryProvider>
	);
}
