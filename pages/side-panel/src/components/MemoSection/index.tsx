import { ErrorBoundary } from "@web-memo/ui";
import { Suspense } from "react";
import LoginSection from "../LoginSection";
import MemoForm from "./components/MemoForm";
import { MemoFormSkeleton } from "./components/MemoForm/components";
import MemoHeader from "./components/MemoHeader";

export default function MemoSection({ memoHeight }: MemoSectionProps) {
	return (
		<section
			// 입력창이 이 경계에 딱 붙어 포커스 링(1px)이 좌우로 잘린다.
			// 세로는 form 의 py-1 덕에 살아남아 좌우만 안 보였다.
			className="flex flex-col overflow-hidden px-0.5"
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
