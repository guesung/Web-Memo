"use client";

import {captureException} from "@sentry/nextjs";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { toast } from "@web-memo/ui";
import type { PropsWithChildren } from "react";
import { useState } from "react";

interface QueryProviderProps extends PropsWithChildren, LanguageType {}

export default function QueryProvider({ children, lng }: QueryProviderProps) {
	const { t } = useTranslation(lng);

	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { refetchOnWindowFocus: true, staleTime: 1000 * 60 * 5 },
					mutations: {
						onSuccess: async () => {
							await ExtensionBridge.requestRefetchTheMemos();
						},
						onError: (error) => {
							toast({ title: t("toastTitle.errorSave") });
							captureException(error, {
								level: "fatal",
							});
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
