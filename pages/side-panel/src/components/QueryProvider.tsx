"use client";
import { captureException } from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18n } from "@web-memo/shared/utils/extension";
import { toast } from "@web-memo/ui";
import type { PropsWithChildren } from "react";
import { useState } from "react";

// 성능 최적화를 위한 기본 설정
const QUERY_STALE_TIME = 1000 * 60 * 5; // 5분 동안 fresh 상태 유지
const QUERY_GC_TIME = 1000 * 60 * 10; // 10분 후 가비지 컬렉션

export default function QueryProvider({ children }: PropsWithChildren) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: QUERY_STALE_TIME,
						gcTime: QUERY_GC_TIME,
						refetchOnWindowFocus: false, // 사이드 패널에서는 불필요한 리패치 방지
						retry: 1, // 실패 시 1회만 재시도
					},
					mutations: {
						onError: (error) => {
							toast({ title: I18n.get("toast_error_save") });
							captureException(error, {
								level: "fatal",
							});
						},
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
