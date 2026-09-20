"use client";

import { captureException } from "@sentry/nextjs";
import type { LanguageType } from "@src/modules/i18n";
import {
	MutationCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { createErrorReporter, isAbortError } from "@web-memo/shared/utils";
import type { PropsWithChildren } from "react";
import { useState } from "react";

interface QueryProviderProps extends PropsWithChildren, LanguageType {}

const reportMutationError = createErrorReporter({ capture: captureException });

export default function QueryProvider({ children }: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				// defaultOptions.mutations는 개별 useMutation 옵션에 덮어써진다.
				// 메모·카테고리 뮤테이션은 대부분 자체 onSuccess를 갖고 있어
				// 확장 프로그램 동기화가 누락되므로 MutationCache에 등록한다.
				mutationCache: new MutationCache({
					onSuccess: async () => {
						await bridge.request.REFETCH_THE_MEMO_LIST_FROM_WEB();
					},
					onError: (error, _variables, _context, mutation) => {
						if (isAbortError(error)) {
							return;
						}

						const mutationMeta = mutation?.options?.meta as
							| { feature?: string; stage?: string; operation?: string }
							| undefined;

						reportMutationError({
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
