"use client";
import { ErrorBoundary, ErrorFallback, Loading } from "@web-memo/ui";
import { Suspense } from "react";

import NotFoundSection from "./_components/NotFoundSection";

export default function NotFoundPage() {
	return (
		<ErrorBoundary FallbackComponent={ErrorFallback}>
			<Suspense fallback={<Loading />}>
				<NotFoundSection />
			</Suspense>
		</ErrorBoundary>
	);
}
