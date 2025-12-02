"use client";

import type { LanguageType } from "@src/modules/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import type { PropsWithChildren } from "react";
import { useState } from "react";

interface QueryProviderProps extends PropsWithChildren, LanguageType {}

export default function QueryProvider({ children }: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 1000 * 60 * 5,
						gcTime: 1000 * 60 * 30,
					},
					mutations: {
						onSuccess: async () => {
							await ExtensionBridge.requestRefetchTheMemosFromWeb();
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
