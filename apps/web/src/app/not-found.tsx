"use client";
import { ErrorBoundary, ErrorFallback, Loading } from "@web-memo/ui";
import { Suspense } from "react";

import NotFoundSection from "./_components/NotFoundSection";

/**
 * 매칭되는 라우트가 없거나 `notFound()`가 호출됐을 때 그려지는 전역 404 화면.
 *
 * @description
 * 루트 레이아웃(`app/layout.tsx`)이 동적 세그먼트 밖에 있어야 이 파일이 정상적으로
 * SSR된다. `[lng]/layout.tsx`를 루트로 썼을 때는 매칭되지 않는 경로에서 Next가 이
 * 트리를 그리지 못하고 빈 오류 셸(`<html id="__next_error__">`)만 반환했다.
 */
export default function NotFoundPage() {
	return (
		<ErrorBoundary FallbackComponent={ErrorFallback}>
			<Suspense fallback={<Loading />}>
				<NotFoundSection />
			</Suspense>
		</ErrorBoundary>
	);
}
