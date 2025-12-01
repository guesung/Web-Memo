"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import type { PropsWithChildren } from "react";
import { useState } from "react";

interface QueryProviderProps extends PropsWithChildren {}

export default function QueryProvider({ children }: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 1000 * 60 * 5, // 5분간 fresh 상태 유지
						gcTime: 1000 * 60 * 30, // 30분간 캐시 유지
						refetchOnWindowFocus: false, // 창 포커스 시 자동 refetch 비활성화
						retry: 1, // 재시도 1회로 제한
					},
					mutations: {
						onSuccess: async () => {
							await ExtensionBridge.requestRefetchTheMemos();
						},
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			{children}

			{/* <ReactQueryDevtools initialIsOpen={false} /> */}
		</QueryClientProvider>
	);
}
