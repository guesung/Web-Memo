"use client";

import type { LanguageType } from "@src/modules/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type { PropsWithChildren } from "react";
import { useState } from "react";

interface QueryProviderProps extends PropsWithChildren, LanguageType {}

export default function QueryProvider({ children }: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					mutations: {
						onSuccess: async () => {
							await bridge.request.REFETCH_THE_MEMO_LIST_FROM_WEB();
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
