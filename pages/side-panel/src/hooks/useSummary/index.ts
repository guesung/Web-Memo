import { CONFIG } from "@web-memo/env";
import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { I18n } from "@web-memo/shared/utils/extension";
import { useCallback, useState } from "react";
import { getSummaryPrompt, processStreamingResponse } from "./util";

interface UseSummaryProps {
	content: string;
	category: Category;
	isPageContentLoading: boolean;
}

interface UseSummaryReturn {
	isSummaryLoading: boolean;
	summary: string;
	errorMessage: string;
	generateSummary: () => Promise<void>;
}

export default function useSummary({
	content,
	category,
	isPageContentLoading,
}: UseSummaryProps): UseSummaryReturn {
	const [summary, setSummary] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);

	const generateSummary = useCallback(async () => {
		setSummary("");
		setErrorMessage("");

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

	return {
		isSummaryLoading: isPageContentLoading || isGenerating,
		summary,
		generateSummary,
		errorMessage,
	};
}
