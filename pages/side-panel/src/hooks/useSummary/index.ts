import { CONFIG } from "@web-memo/env";
import { useFetch } from "@web-memo/shared/hooks";
import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import { useState } from "react";
import { DEFAULT_CATEGORY } from "./constant";
import {
	getPageContent,
	getSummaryPrompt,
	processStreamingResponse,
} from "./util";

interface UseSummaryReturn {
	isSummaryLoading: boolean;
	summary: string;
	refetchSummary: () => void;
	category: Category;
	errorMessage: string;
	pageContent: string;
}

export default function useSummary(): UseSummaryReturn {
	const [summary, setSummary] = useState("");
	const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
	const [errorMessage, setErrorMessage] = useState("");
	const [pageContent, setPageContent] = useState("");

	const resetSummaryState = () => {
		setSummary("");
		setCategory(DEFAULT_CATEGORY);
		setErrorMessage("");
		setPageContent("");
	};

	const startSummary = async () => {
		resetSummaryState();

		try {
			const tabs = await Tab.get();
			if (!tabs?.url) return;

			const { content: fetchedContent, category: currentCategory } =
				await getPageContent(tabs.url);
			setCategory(currentCategory);
			setPageContent(fetchedContent);

			const messages = await getSummaryPrompt(fetchedContent, currentCategory);

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
				(content) => {
					setSummary((prev) => prev + content);
				},
				(error) => {
					setErrorMessage(error);
					setCategory(DEFAULT_CATEGORY);
				},
			);
		} catch (error) {
			console.error("Summary error:", error);
			setErrorMessage(I18n.get("error_get_page_content"));
			setCategory(DEFAULT_CATEGORY);
		}
	};

	const { isLoading, refetch: refetchSummary } = useFetch({
		fetchFn: startSummary,
	});

	return {
		isSummaryLoading: isLoading,
		summary,
		refetchSummary,
		category,
		errorMessage,
		pageContent,
	};
}
