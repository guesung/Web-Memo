"use client";
import { captureException } from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18n } from "@web-memo/shared/utils/extension";
import { toast } from "@web-memo/ui";
import type { PropsWithChildren } from "react";
import { useState } from "react";

export default function QueryProvider({ children }: PropsWithChildren) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
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
