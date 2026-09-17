import { captureException } from "@sentry/react";
import { CONFIG } from "@web-memo/env";
import { analytics } from "@web-memo/shared/modules/analytics";
import { I18n } from "@web-memo/shared/utils/extension";
import { useCallback, useRef, useState } from "react";
import { usePageContentContext } from "../../components/PageContentProvider";
import { getSummaryPrompt, processStreamingResponse } from "./util";

const ERROR_REPORTING_WINDOW_MS = 8_000;
const ERROR_FEATURE = "summary";
const ERROR_OPERATION = "generate";

const isExpectedSummaryError = (error: unknown): boolean => {
	if (!(error instanceof Error)) return false;
	return error.name === "AbortError";
};

interface UseSummaryReturn {
	isSummaryLoading: boolean;
	summary: string;
	errorMessage: string;
	generateSummary: () => Promise<void>;
}

export default function useSummary(): UseSummaryReturn {
	const [summary, setSummary] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const lastErrorRef = useRef(new Map<string, number>());
	const {
		content,
		category,
		error: pageContentError,
	} = usePageContentContext();

	const reportSummaryFailure = useCallback(
		(
			error: unknown,
			stage: "reader" | "parse" | "server" | "fetch" | "general",
		) => {
			if (isExpectedSummaryError(error)) return;

			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const summaryErrorMessage = errorMessage || "unknown-summary-error";
			const now = Date.now();
			const fingerprint = `${ERROR_FEATURE}|${ERROR_OPERATION}|${stage}|${summaryErrorMessage.slice(0, 120)}`;
			const last = lastErrorRef.current.get(fingerprint) ?? 0;
			if (now - last < ERROR_REPORTING_WINDOW_MS) return;
			lastErrorRef.current.set(fingerprint, now);

			captureException(
				error instanceof Error ? error : new Error(summaryErrorMessage),
				{
					level: "error",
					tags: {
						feature: ERROR_FEATURE,
						operation: ERROR_OPERATION,
						stage,
					},
					fingerprint: [ERROR_FEATURE, ERROR_OPERATION, stage],
					extra: {
						feature: ERROR_FEATURE,
						operation: ERROR_OPERATION,
						stage,
						occurredAt: now,
					},
				},
			);
		},
		[],
	);

	const generateSummary = useCallback(async () => {
		if (pageContentError) {
			setErrorMessage(I18n.get("error_get_page_content"));
			return;
		}

		if (!content.trim()) {
			setErrorMessage(I18n.get("error_get_page_content"));
			return;
		}

		setSummary("");
		setErrorMessage("");

		setIsGenerating(true);

		analytics.trackEvent({ name: "summary_run" });
		const startedAt = Date.now();

		try {
			const messages = await getSummaryPrompt(content, category);

			const response = await fetch(`${CONFIG.webUrl}/api/openai`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ messages }),
			});

			if (!response.ok) {
				reportSummaryFailure(
					new Error(`요약 API 응답 실패: ${response.status}`),
					"fetch",
				);
				setErrorMessage(I18n.get("error_get_summary"));
				return;
			}

			let hasStreamError = false;

			await processStreamingResponse(
				response,
				(streamContent) => {
					setSummary((prev) => prev + streamContent);
				},
				(error, stage) => {
					hasStreamError = true;
					reportSummaryFailure(
						new Error(error),
						stage === "server" ? "server" : stage,
					);
					analytics.trackEvent({
						name: "summary_fail",
						params: { reason: error },
					});
					setErrorMessage(I18n.get("error_get_summary"));
				},
			);

			// 스트리밍 도중 끊긴 요약은 완료로 세지 않습니다. 실행 대비 완료 비율이 곧 성공률입니다.
			if (!hasStreamError) {
				analytics.trackEvent({
					name: "summary_complete",
					params: { duration_msec: Date.now() - startedAt },
				});
			}
		} catch (error) {
			if (!isExpectedSummaryError(error)) {
				console.error("Summary error:", error);
				analytics.trackEvent({
					name: "summary_fail",
					params: {
						reason: error instanceof Error ? error.message : "unknown",
					},
				});
				reportSummaryFailure(error, "general");
				setErrorMessage(I18n.get("error_get_summary"));
			}
		} finally {
			setIsGenerating(false);
		}
	}, [content, category, pageContentError, reportSummaryFailure]);

	return {
		isSummaryLoading: isGenerating,
		summary,
		generateSummary,
		errorMessage,
	};
}
