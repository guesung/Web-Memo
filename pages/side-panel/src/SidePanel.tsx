import { useDidMount } from "@web-memo/shared/hooks";
import {
	AnalyticsUserTracking,
	analytics,
} from "@web-memo/shared/modules/analytics";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	ErrorBoundary,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Toaster,
} from "@web-memo/ui";
import { GripHorizontal, MessageSquare, FileText } from "lucide-react";
import { Suspense, useState } from "react";
import {
	Chat,
	LoginSection,
	MemoForm,
	MemoFormSkeleton,
	MemoHeader,
	QueryProvider,
	Summary,
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
					<section
						className="flex flex-col overflow-hidden"
						style={{ height: `${summaryHeight}%` }}
					>
						<Tabs
							value={activeTab}
							onValueChange={setActiveTab}
							className="flex flex-col h-full"
						>
							<TabsList className="mt-4 w-full grid grid-cols-2">
								<TabsTrigger value="summary" className="flex items-center gap-1.5">
									<FileText size={14} />
									{I18n.get("summary")}
								</TabsTrigger>
								<TabsTrigger value="chat" className="flex items-center gap-1.5">
									<MessageSquare size={14} />
									{I18n.get("chat_title")}
								</TabsTrigger>
							</TabsList>

							<TabsContent value="summary" className="flex-1 overflow-y-auto mt-0">
								<ErrorBoundary>
									<Summary />
								</ErrorBoundary>
							</TabsContent>

							<TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
								<ErrorBoundary>
									<Chat />
								</ErrorBoundary>
							</TabsContent>
						</Tabs>
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
			</SummaryProvider>
		</QueryProvider>
	);
}
