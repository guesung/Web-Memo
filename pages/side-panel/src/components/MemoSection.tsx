import { ErrorBoundary } from "@web-memo/ui";
import { Suspense } from "react";
import { LoginSection, MemoForm } from ".";
import { MemoFormSkeleton, MemoHeader } from "./MemoForm/components";

export default function MemoSection({ memoHeight }: MemoSectionProps) {
	return (
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
	);
}

interface MemoSectionProps {
	memoHeight: number;
}
