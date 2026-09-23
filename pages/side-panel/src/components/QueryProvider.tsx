"use client";
import {
	MutationCache,
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import {
	getResultError,
	isAbortError,
	isLoggedOutError,
	isNetworkError,
} from "@web-memo/shared/utils";
import { I18n } from "@web-memo/shared/utils/extension";
import { toast } from "@web-memo/ui";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { reportSidePanelError } from "../utils";

export default function QueryProvider({ children }: PropsWithChildren) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				// Supabase는 실패를 던지지 않고 `{ error }` 값으로 돌려줘 React Query가 성공으로 본다.
				// 화면 동작은 그대로 두고, 값으로 담긴 오류만 Sentry에 보고한다.
				queryCache: new QueryCache({
					onError: (error, query) => {
						if (isAbortError(error) || isLoggedOutError(error)) {
							return;
						}

						reportSidePanelError({
							error,
							feature: "side-panel",
							operation: String(query.queryKey[0]),
							stage: "query",
							level: isNetworkError(error) ? "warning" : undefined,
							groupByMessage: true,
						});
					},
					onSuccess: (data, query) => {
						const resultError = getResultError(data);

						if (!resultError) {
							return;
						}

						reportSidePanelError({
							error: resultError,
							feature: "side-panel",
							operation: String(query.queryKey[0]),
							stage: "query-result",
							level: isNetworkError(resultError) ? "warning" : undefined,
							groupByMessage: true,
						});
					},
				}),
				// defaultOptions.mutations.onError는 개별 useMutation의 onError가 있으면 덮어써진다.
				// MutationCache의 onError는 항상 함께 실행되므로 저장 실패를 놓치지 않는다.
				mutationCache: new MutationCache({
					onSuccess: (data, _variables, _context, mutation) => {
						const resultError = getResultError(data);

						if (!resultError) {
							return;
						}

						const mutationMeta = mutation?.options?.meta as
							| { feature?: string; stage?: string; operation?: string }
							| undefined;

						reportSidePanelError({
							error: resultError,
							feature: mutationMeta?.feature ?? "side-panel",
							operation: mutationMeta?.operation ?? "mutation",
							stage: mutationMeta?.stage ?? "unknown",
							groupByMessage: true,
						});
					},
					onError: (error, _variables, _context, mutation) => {
						if (isAbortError(error)) {
							return;
						}

						toast({ title: I18n.get("toast_error_save") });

						const mutationMeta = mutation?.options?.meta as
							| { feature?: string; stage?: string; operation?: string }
							| undefined;

						reportSidePanelError({
							error,
							feature: mutationMeta?.feature ?? "side-panel",
							operation: mutationMeta?.operation ?? "mutation",
							stage: mutationMeta?.stage ?? "unknown",
							groupByMessage: true,
						});
					},
				}),
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
