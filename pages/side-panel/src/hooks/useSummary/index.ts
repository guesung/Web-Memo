import { CONFIG } from "@web-memo/env";
import { analytics } from "@web-memo/shared/modules/analytics";
import { I18n } from "@web-memo/shared/utils/extension";
import { useCallback, useState } from "react";
import { usePageContentContext } from "../../components/PageContentProvider";
import { getSummaryPrompt, processStreamingResponse } from "./util";

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
	const {
		content,
		category,
		error: pageContentError,
	} = usePageContentContext();

	const generateSummary = useCallback(async () => {
		if (pageContentError) {
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

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`);

			let hasStreamError = false;

			await processStreamingResponse(
				response,
				(streamContent) => {
					setSummary((prev) => prev + streamContent);
				},
				(error) => {
					setErrorMessage(error);
					hasStreamError = true;
					analytics.trackEvent({
						name: "summary_fail",
						params: { reason: error },
					});
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
			console.error("Summary error:", error);
			analytics.trackEvent({
				name: "summary_fail",
				params: { reason: error instanceof Error ? error.message : "unknown" },
			});
			setErrorMessage(I18n.get("error_get_page_content"));
		} finally {
			setIsGenerating(false);
		}
	}, [content, category, pageContentError]);

	return {
		isSummaryLoading: isGenerating,
		summary,
		generateSummary,
		errorMessage,
	};
}
