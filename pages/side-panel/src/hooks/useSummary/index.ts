import { skipToken, useQuery } from "@tanstack/react-query";
import { CONFIG } from "@web-memo/env";
import { QUERY_KEY } from "@web-memo/shared/constants";
import {
	supabaseClientQueryOptions,
	userQueryOptions,
} from "@web-memo/shared/hooks";
import {
	analytics,
	type TSummaryRunSource,
} from "@web-memo/shared/modules/analytics";
import { isAbortError } from "@web-memo/shared/utils";
import { I18n } from "@web-memo/shared/utils/extension";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePageContentContext } from "../../components/PageContentProvider";
import { reportPageFeatureError } from "../../utils";
import { getSummaryPrompt, processStreamingResponse } from "./util";

const reportSummaryFailure = (error: unknown, stage: string) => {
	void reportPageFeatureError({
		error,
		feature: "summary",
		operation: "generate",
		stage,
	});
};

interface UseSummaryReturn {
	isSummaryLoading: boolean;
	hasRequestedSummary: boolean;
	isAuthenticated: boolean;
	isAuthPending: boolean;
	summary: string;
	errorMessage: string;
	generateSummary: (source: TSummaryRunSource) => Promise<void>;
}

export default function useSummary(): UseSummaryReturn {
	const [state, setState] = useState({
		pageKey: "",
		summary: "",
		errorMessage: "",
		isGenerating: false,
		hasRequestedSummary: false,
	});
	const activeRequestRef = useRef<{
		pageKey: string;
		controller: AbortController;
	} | null>(null);
	const {
		pageKey,
		content,
		category,
		isLoading: isPageContentLoading,
		error: pageContentError,
	} = usePageContentContext();
	const currentPageKeyRef = useRef(pageKey);
	currentPageKeyRef.current = pageKey;
	const clientQuery = useQuery(supabaseClientQueryOptions());
	const supabaseClient = clientQuery.data;
	const userQuery = useQuery({
		queryKey: QUERY_KEY.user(),
		queryFn: supabaseClient
			? userQueryOptions(supabaseClient).queryFn
			: skipToken,
		retry: false,
	});
	const userResponse = userQuery.data;

	useEffect(() => {
		const scope = pageKey;
		setState({
			pageKey: scope,
			summary: "",
			errorMessage: "",
			isGenerating: false,
			hasRequestedSummary: false,
		});
		return () => {
			if (activeRequestRef.current?.pageKey === scope) {
				activeRequestRef.current.controller.abort();
				activeRequestRef.current = null;
			}
		};
	}, [pageKey]);

	const generateSummary = useCallback(
		async (source: TSummaryRunSource) => {
			if (
				!userResponse?.data.user ||
				!pageKey ||
				isPageContentLoading ||
				activeRequestRef.current
			) {
				return;
			}

			if (pageContentError || !content.trim()) {
				setState({
					pageKey,
					summary: "",
					errorMessage: I18n.get("error_get_page_content"),
					isGenerating: false,
					hasRequestedSummary: false,
				});
				return;
			}

			const controller = new AbortController();
			activeRequestRef.current = { pageKey, controller };
			const isCurrentRequest = () =>
				activeRequestRef.current?.controller === controller &&
				currentPageKeyRef.current === pageKey &&
				!controller.signal.aborted;
			setState({
				pageKey,
				summary: "",
				errorMessage: "",
				isGenerating: true,
				hasRequestedSummary: true,
			});

			analytics.trackEvent({ name: "summary_run", params: { source } });
			const startedAt = Date.now();

			try {
				const messages = await getSummaryPrompt(content, category);
				if (!isCurrentRequest()) return;

				const response = await fetch(`${CONFIG.webUrl}/api/openai`, {
					method: "POST",
					signal: controller.signal,
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ messages }),
				});
				if (!isCurrentRequest()) return;

				if (!response.ok) {
					reportSummaryFailure(
						new Error(`요약 API 응답 실패: ${response.status}`),
						"fetch",
					);
					analytics.trackEvent({
						name: "summary_fail",
						params: { reason: `http_${response.status}` },
					});
					setState((prev) => ({
						...prev,
						errorMessage: I18n.get("error_get_summary"),
					}));
					return;
				}

				let hasStreamError = false;

				await processStreamingResponse(
					response,
					(streamContent) => {
						if (isCurrentRequest()) {
							setState((prev) => ({
								...prev,
								summary: prev.summary + streamContent,
							}));
						}
					},
					(error, stage) => {
						if (!isCurrentRequest()) return;
						hasStreamError = true;
						reportSummaryFailure(new Error(error), stage);
						analytics.trackEvent({
							name: "summary_fail",
							params: { reason: error },
						});
						setState((prev) => ({
							...prev,
							errorMessage: I18n.get("error_get_summary"),
						}));
					},
				);

				// 스트리밍 도중 끊긴 요약은 완료로 세지 않습니다. 실행 대비 완료 비율이 곧 성공률입니다.
				if (!hasStreamError && isCurrentRequest()) {
					analytics.trackEvent({
						name: "summary_complete",
						params: { duration_msec: Date.now() - startedAt },
					});
				}
			} catch (error) {
				if (isCurrentRequest() && !isAbortError(error)) {
					console.error("Summary error:", error);
					analytics.trackEvent({
						name: "summary_fail",
						params: {
							reason: error instanceof Error ? error.message : "unknown",
						},
					});
					reportSummaryFailure(error, "general");
					setState((prev) => ({
						...prev,
						errorMessage: I18n.get("error_get_summary"),
					}));
				}
			} finally {
				if (isCurrentRequest()) {
					activeRequestRef.current = null;
					setState((prev) => ({ ...prev, isGenerating: false }));
				}
			}
		},
		[
			content,
			category,
			isPageContentLoading,
			pageContentError,
			pageKey,
			userResponse,
		],
	);
	const currentState =
		state.pageKey === pageKey
			? state
			: {
					pageKey,
					summary: "",
					errorMessage: "",
					isGenerating: false,
					hasRequestedSummary: false,
				};

	return {
		isSummaryLoading: currentState.isGenerating,
		hasRequestedSummary: currentState.hasRequestedSummary,
		isAuthenticated: Boolean(userResponse?.data.user),
		isAuthPending:
			clientQuery.isPending || (Boolean(supabaseClient) && userQuery.isPending),
		summary: currentState.summary,
		generateSummary,
		errorMessage: currentState.errorMessage,
	};
}
