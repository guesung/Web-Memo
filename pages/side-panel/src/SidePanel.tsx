import { useDidMount } from "@web-memo/shared/hooks";
import {
	AnalyticsUserTracking,
	analytics,
} from "@web-memo/shared/modules/analytics";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { ErrorBoundary, Toaster } from "@web-memo/ui";
import { GripHorizontal } from "lucide-react";
import { Suspense } from "react";
import {
	LoginSection,
	MemoForm,
	MemoFormSkeleton,
	MemoHeader,
	QueryProvider,
	Summary,
} from "./components";
import { useResizablePanel } from "./hooks";

export default function SidePanel() {
	const {
		summaryHeight,
		memoHeight,
		isResizing,
		containerRef,
		handleMouseDown,
	} = useResizablePanel();

	useDidMount(() => {
		ExtensionBridge.responseGetSidePanelOpen();
		analytics.trackSidePanelOpen();
		analytics.trackPageView("Side Panel", window.location.href);
	});

	return (
		<QueryProvider>
			<main
				ref={containerRef}
				className="prose prose-sm bg-background text-foreground relative flex h-lvh flex-col px-4 max-w-none overflow-x-hidden"
			>
				<section
					className="overflow-y-scroll"
					style={{ height: `${summaryHeight}%` }}
				>
					<ErrorBoundary>
						<Summary />
					</ErrorBoundary>
				</section>
				<div
					role="slider"
					aria-label="Resize panels"
					aria-valuemin={20}
					aria-valuemax={80}
					aria-valuenow={Math.round(summaryHeight)}
					tabIndex={0}
					className="group flex h-3 shrink-0 cursor-row-resize items-center justify-center hover:bg-muted/50 transition-colors"
					onMouseDown={handleMouseDown}
				>
					<GripHorizontal
						className={`h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors ${isResizing ? "text-muted-foreground" : ""}`}
					/>
				</div>
				<section
					className="flex flex-col overflow-hidden"
					style={{ height: `${memoHeight}%` }}
				>
					<MemoHeader />
					<ErrorBoundary FallbackComponent={LoginSection}>
						<Suspense fallback={<MemoFormSkeleton />}>
							<MemoForm />
						</Suspense>
					</ErrorBoundary>
				</section>
			</main>
			<Toaster />
			<ErrorBoundary>
				<Suspense>
					<AnalyticsUserTracking />
				</Suspense>
			</ErrorBoundary>
			{/* <ReactQueryDevtools initialIsOpen={false} /> */}
		</QueryProvider>
	);
}
