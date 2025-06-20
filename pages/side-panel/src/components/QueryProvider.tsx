"use client";
import { I18n } from "@extension/shared/utils/extension";
import { toast } from "@extension/ui";
import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";

export default function QueryProvider({ children }: PropsWithChildren) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { refetchOnWindowFocus: true },
					mutations: {
						onError: (error) => {
							toast({ title: I18n.get("toast_error_save") });
							Sentry.captureException(error, {
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
