import { CONFIG } from "@web-memo/env";
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
	}, [content, category, pageContentError]);

	return {
		isSummaryLoading: isGenerating,
		summary,
		generateSummary,
		errorMessage,
	};
}
