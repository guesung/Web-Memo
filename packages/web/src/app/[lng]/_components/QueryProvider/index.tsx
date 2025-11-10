"use client";

import type { LanguageType } from "@src/modules/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
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
							await ExtensionBridge.requestRefetchTheMemos();
						},
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			{children}

			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
}
