"use client";
import { captureException } from "@sentry/react";
import {
	MutationCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { I18n } from "@web-memo/shared/utils/extension";
import { toast } from "@web-memo/ui";
import type { PropsWithChildren } from "react";
import { useState } from "react";

export default function QueryProvider({ children }: PropsWithChildren) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				// defaultOptions.mutations.onError는 개별 useMutation의 onError가 있으면 덮어써진다.
				// MutationCache의 onError는 항상 함께 실행되므로 저장 실패를 놓치지 않는다.
				mutationCache: new MutationCache({
					onError: (error) => {
						toast({ title: I18n.get("toast_error_save") });
						captureException(error, {
							level: "fatal",
						});
					},
				}),
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
