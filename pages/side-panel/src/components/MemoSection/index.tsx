import { ErrorBoundary } from "@web-memo/ui";
import { Suspense } from "react";
import LoginSection from "../LoginSection";
import MemoForm from "./components/MemoForm";
import { MemoFormSkeleton } from "./components/MemoForm/components";
import MemoHeader from "./components/MemoHeader";

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
