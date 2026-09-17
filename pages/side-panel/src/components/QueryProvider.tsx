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
import { useRef, useState } from "react";

const ERROR_REPORTING_WINDOW_MS = 8_000;

const isExpectedMutationError = (error: unknown): boolean => {
	if (!(error instanceof Error)) return false;

	if (error.name === "AbortError" || error.name === "CanceledError") {
		return true;
	}

	return false;
};

export default function QueryProvider({ children }: PropsWithChildren) {
	const lastErrorRef = useRef(new Map<string, number>());

	const [queryClient] = useState(
		() =>
			new QueryClient({
				// defaultOptions.mutations.onError는 개별 useMutation의 onError가 있으면 덮어써진다.
				// MutationCache의 onError는 항상 함께 실행되므로 저장 실패를 놓치지 않는다.
				mutationCache: new MutationCache({
					onError: (error, _variables, _context, mutation) => {
						if (isExpectedMutationError(error)) return;
						toast({ title: I18n.get("toast_error_save") });

						const mutationMeta = mutation?.options?.meta as
							| { feature?: string; stage?: string; operation?: string }
							| undefined;
						const feature = mutationMeta?.feature ?? "side-panel";
						const operation = mutationMeta?.operation ?? "mutation";
						const stage = mutationMeta?.stage ?? "unknown";
						const message =
							error instanceof Error ? error.message : String(error);
						const messageKey =
							message.slice(0, 120) || "mutation-error-without-message";
						const fingerprint = `${feature}|${operation}|${stage}|${messageKey}`;

						const now = Date.now();
						const last = lastErrorRef.current.get(fingerprint) ?? 0;
						if (now - last < ERROR_REPORTING_WINDOW_MS) return;
						lastErrorRef.current.set(fingerprint, now);

						captureException(error, {
							level: "error",
							tags: {
								feature,
								operation,
								stage,
							},
							fingerprint: [feature, operation, stage, messageKey],
							extra: {
								feature,
								operation,
								stage,
								occurredAt: now,
							},
						});
					},
				}),
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
