import { useDidMount } from "@web-memo/shared/hooks";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { ErrorBoundary, Loading, Toaster } from "@web-memo/ui";
import { Suspense } from "react";

import {
	LoginSection,
	MemoForm,
	MemoHeader,
	QueryProvider,
	Summary,
	SummaryHeader,
	SummaryProvider,
} from "./components";

export default function SidePanel() {
	useDidMount(ExtensionBridge.responseGetSidePanelOpen);

	return (
		<QueryProvider>
			<main className="prose prose-sm bg-background text-foreground relative flex h-lvh flex-col px-4 max-w-none overflow-x-hidden">
				<section className="flex-1 overflow-scroll">
					<ErrorBoundary>
						<SummaryProvider>
							<SummaryHeader />
							<Summary />
						</SummaryProvider>
					</ErrorBoundary>
				</section>
				<section className="flex h-1/2 flex-col">
					<MemoHeader />
					<ErrorBoundary FallbackComponent={LoginSection}>
						<Suspense fallback={<Loading />}>
							<MemoForm />
						</Suspense>
					</ErrorBoundary>
				</section>
			</main>
			<Toaster />
			{/* <ReactQueryDevtools initialIsOpen={false} /> */}
		</QueryProvider>
	);
}
