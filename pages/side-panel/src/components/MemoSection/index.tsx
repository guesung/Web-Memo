import { useSyncLoginStatus } from "@src/hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
	categoryQueryOptions,
	memoQueryOptions,
	settingQueryOptions,
	supabaseClientQueryOptions,
	userQueryOptions,
	useTabQuery,
} from "@web-memo/shared/hooks";
import { ErrorBoundary } from "@web-memo/ui";
import { Suspense, useEffect, useRef } from "react";
import LoginSection from "../LoginSection";
import NoticeBanner from "../NoticeBanner";
import MemoForm from "./components/MemoForm";
import { MemoFormSkeleton } from "./components/MemoForm/components";
import MemoHeader from "./components/MemoHeader";

export default function MemoSection({ memoHeight }: MemoSectionProps) {
	const loginBoundaryRef = useRef<ErrorBoundary>(null);
	const queryClient = useQueryClient();
	const { data: tab } = useTabQuery();

	useSyncLoginStatus(loginBoundaryRef);

	// user·setting·category는 로그인 상태에서만 한 번 준비하면 되므로 tab.url과 무관하게 둔다.
	useEffect(
		function prefetchUserSettingCategory() {
			const prefetch = async () => {
				try {
					const supabaseClient = await queryClient.ensureQueryData(
						supabaseClientQueryOptions(),
					);

					await Promise.all([
						queryClient.prefetchQuery(userQueryOptions(supabaseClient)),
						queryClient.prefetchQuery(settingQueryOptions(supabaseClient)),
						queryClient.prefetchQuery(categoryQueryOptions(supabaseClient)),
					]);
				} catch {
					// 세션이 없어 클라이언트를 준비하지 못하면 폼 안 Suspense 경로(LoginSection)가 처리한다.
				}
			};

			void prefetch();
		},
		[queryClient],
	);

	// 탭 url이 바뀌면 메모만 다시 prefetch한다. user·setting·category는 그대로 재사용한다.
	useEffect(
		function prefetchMemo() {
			const prefetch = async () => {
				try {
					const supabaseClient = await queryClient.ensureQueryData(
						supabaseClientQueryOptions(),
					);

					await queryClient.prefetchQuery(
						memoQueryOptions({ supabaseClient, url: tab?.url }),
					);
				} catch {
					// 세션이 없어 클라이언트를 준비하지 못하면 폼 안 Suspense 경로(LoginSection)가 처리한다.
				}
			};

			void prefetch();
		},
		[queryClient, tab?.url],
	);

	return (
		<section
			// 입력창이 이 경계에 딱 붙어 포커스 링(1px)이 좌우로 잘린다.
			// 세로는 form 의 py-1 덕에 살아남아 좌우만 안 보였다.
			className="flex flex-col overflow-hidden px-0.5"
			style={{ height: `${memoHeight}%` }}
		>
			<NoticeBanner />
			<MemoHeader />
			<ErrorBoundary ref={loginBoundaryRef} FallbackComponent={LoginSection}>
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
