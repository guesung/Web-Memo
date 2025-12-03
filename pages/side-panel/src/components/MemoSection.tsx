import { ErrorBoundary } from "@web-memo/ui";
import { Suspense } from "react";
import { LoginSection, MemoForm } from ".";
import { MemoFormSkeleton, MemoHeader } from "./MemoForm/components";

export default function MemoSection({ height }: MemoSectionProps) {
	return (
		<section
			className="flex flex-col overflow-hidden"
			style={{ height: `${height}%` }}
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
	height: number;
}
