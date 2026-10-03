"use client";

import { addBreadcrumb, captureException } from "@sentry/nextjs";
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

/** 서버 상태와 웹 오류 처리를 제공하는 공급자의 속성. */
interface IFQueryProviderProps extends PropsWithChildren, LanguageType {}

const reportWebError = createErrorReporter({ capture: captureException });

bridge.setFailureReporter((failure) => {
	addBreadcrumb({
		category: "extension.bridge",
		level: "warning",
		data: failure,
	});
});

/** 웹의 서버 상태와 오류 보고를 제공한다. */
const QueryProvider = ({ children }: IFQueryProviderProps) => {
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
							const mutationMeta = mutation?.options?.meta;

							reportWebError({
								error: resultError,
								feature: mutationMeta?.feature ?? "web",
								operation: mutationMeta?.operation ?? "mutation",
								stage: mutationMeta?.stage ?? "unknown",
								groupByMessage: true,
							});
						}

						void notifyExtensionOfMemoChange();
					},
					onError: (error, _variables, _context, mutation) => {
						if (isAbortError(error)) {
							return;
						}

						const mutationMeta = mutation?.options?.meta;

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
};

export default QueryProvider;

/** 선택적 확장 알림은 저장 결과나 완료 시점을 바꾸지 않는다. */
const notifyExtensionOfMemoChange = async () => {
	try {
		await bridge.request.REFETCH_THE_MEMO_LIST_FROM_WEB();
	} catch {
		/** 최종 실패 breadcrumb는 브리지에서 기록한다. */
	}
};
