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
				// networkMode 'always'가 없으면 오프라인일 때 mutation이 일시정지돼 saveMemo가
				// 실패를 못 받고 '저장 중...'에서 멈춘다. 항상 시도해 실패를 오프라인 대기열로
				// 돌릴 기회를 준다.
				defaultOptions: {
					mutations: { networkMode: "always" },
				},
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

						const mutationMeta = mutation?.options?.meta;

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

						// 네트워크 오류는 saveMemo가 오프라인 대기열로 돌려 조용히 처리한다.
						// 여기서 또 실패 토스트를 띄우면 같은 실패를 두 번 알리게 된다.
						if (!isNetworkError(error)) {
							toast({ title: I18n.get("toast_error_save") });
						}

						const mutationMeta = mutation?.options?.meta;

						reportSidePanelError({
							error,
							feature: mutationMeta?.feature ?? "side-panel",
							operation: mutationMeta?.operation ?? "mutation",
							stage: mutationMeta?.stage ?? "unknown",
							level: isNetworkError(error) ? "warning" : undefined,
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
