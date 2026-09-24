"use client";

import { captureException } from "@sentry/nextjs";
import type { LanguageType } from "@src/modules/i18n";
import {
	MutationCache,
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import {
	createErrorReporter,
	getResultError,
	isAbortError,
	isLoggedOutError,
	isNetworkError,
} from "@web-memo/shared/utils";
import type { PropsWithChildren } from "react";
import { useState } from "react";

interface QueryProviderProps extends PropsWithChildren, LanguageType {}

const reportWebError = createErrorReporter({ capture: captureException });

export default function QueryProvider({ children }: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				// defaultOptions.mutations는 개별 useMutation 옵션에 덮어써진다.
				// 메모·카테고리 뮤테이션은 대부분 자체 onSuccess를 갖고 있어
				// 확장 프로그램 동기화가 누락되므로 MutationCache에 등록한다.
				// Supabase는 실패를 던지지 않고 `{ error }` 값으로 돌려줘 React Query가 성공으로 본다.
				// 화면 동작은 그대로 두고, 값으로 담긴 오류만 Sentry에 보고한다.
				queryCache: new QueryCache({
					onError: (error, query) => {
						if (isAbortError(error) || isLoggedOutError(error)) {
							return;
						}

						reportWebError({
							error,
							feature: "web",
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

						reportWebError({
							error: resultError,
							feature: "web",
							operation: String(query.queryKey[0]),
							stage: "query-result",
							level: isNetworkError(resultError) ? "warning" : undefined,
							groupByMessage: true,
						});
					},
				}),
				mutationCache: new MutationCache({
					onSuccess: (data, _variables, _context, mutation) => {
						const resultError = getResultError(data);

						if (resultError) {
							const mutationMeta = mutation?.options?.meta as
								| { feature?: string; stage?: string; operation?: string }
								| undefined;

							reportWebError({
								error: resultError,
								feature: mutationMeta?.feature ?? "web",
								operation: mutationMeta?.operation ?? "mutation",
								stage: mutationMeta?.stage ?? "unknown",
								groupByMessage: true,
							});
						}

						// 확장이 없어도 서버 저장 성공을 실패로 바꾸지 않습니다.
						void bridge.request
							.REFETCH_THE_MEMO_LIST_FROM_WEB()
							.catch(() => {});
					},
					onError: (error, _variables, _context, mutation) => {
						if (isAbortError(error)) {
							return;
						}

						const mutationMeta = mutation?.options?.meta as
							| { feature?: string; stage?: string; operation?: string }
							| undefined;

						reportWebError({
							error,
							feature: mutationMeta?.feature ?? "web",
							operation: mutationMeta?.operation ?? "mutation",
							stage: mutationMeta?.stage ?? "unknown",
							groupByMessage: true,
						});
					},
				}),
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			{children}

			{/* <ReactQueryDevtools initialIsOpen={false} /> */}
		</QueryClientProvider>
	);
}
