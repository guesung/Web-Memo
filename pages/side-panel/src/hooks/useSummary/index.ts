import { CONFIG } from "@web-memo/env";
import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { I18n } from "@web-memo/shared/utils/extension";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSummaryPrompt, processStreamingResponse } from "./util";

interface UseSummaryProps {
	content: string;
	category: Category;
	isPageContentLoading: boolean;
	fetchPageContent: () => Promise<void>;
}

interface UseSummaryReturn {
	isSummaryLoading: boolean;
	summary: string;
	refetchSummary: () => void;
	errorMessage: string;
}

export default function useSummary({
	content,
	category,
	isPageContentLoading,
	fetchPageContent,
}: UseSummaryProps): UseSummaryReturn {
	const [summary, setSummary] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const isInitialMount = useRef(true);

	const resetSummaryState = useCallback(() => {
		setSummary("");
		setErrorMessage("");
	}, []);

	const generateSummary = useCallback(async () => {
		if (!content) return;

		setIsGenerating(true);

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

			await processStreamingResponse(
				response,
				(streamContent) => {
					setSummary((prev) => prev + streamContent);
				},
				(error) => {
					setErrorMessage(error);
				},
			);
		} catch (error) {
			console.error("Summary error:", error);
			setErrorMessage(I18n.get("error_get_page_content"));
		} finally {
			setIsGenerating(false);
		}
	}, [content, category]);

	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false;
			return;
		}

		if (content && !isPageContentLoading) {
			generateSummary();
		}
	}, [content, isPageContentLoading, generateSummary]);

	const refetchSummary = useCallback(async () => {
		resetSummaryState();
		await fetchPageContent();
	}, [fetchPageContent, resetSummaryState]);

	return {
		isSummaryLoading: isPageContentLoading || isGenerating,
		summary,
		refetchSummary,
		errorMessage,
	};
}
