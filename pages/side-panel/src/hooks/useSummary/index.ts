import { CONFIG } from "@web-memo/env";
import { useDidMount } from "@web-memo/shared/hooks";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import { useCallback, useState } from "react";
import { DEFAULT_CATEGORY } from "./constant";
import {
	getPageContent,
	getSummaryPrompt,
	processStreamingResponse,
} from "./util";

interface UseSummaryReturn {
	isSummaryLoading: boolean;
	summary: string;
	startSummary: () => void;
	category: Category;
	errorMessage: string;
	isAutoSummaryEnabled: boolean;
}

export default function useSummary(): UseSummaryReturn {
	const [summary, setSummary] = useState("");
	const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
	const [errorMessage, setErrorMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isAutoSummaryEnabled, setIsAutoSummaryEnabled] = useState(true);

	const resetSummaryState = useCallback(() => {
		setSummary("");
		setCategory(DEFAULT_CATEGORY);
		setErrorMessage("");
	}, []);

	const executeSummary = useCallback(async () => {
		resetSummaryState();
		setIsLoading(true);

		try {
			const tabs = await Tab.get();
			if (!tabs?.url) {
				setIsLoading(false);
				return;
			}

			const { content: pageContent, category: currentCategory } =
				await getPageContent(tabs.url);
			setCategory(currentCategory);

			const messages = await getSummaryPrompt(pageContent, currentCategory);

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
		} finally {
			setIsLoading(false);
		}
	}, [resetSummaryState]);

	useDidMount(
		useCallback(async () => {
			const autoSummary = await ChromeSyncStorage.get<boolean>(
				STORAGE_KEYS.autoSummary,
			);
			const isEnabled = autoSummary ?? true;
			setIsAutoSummaryEnabled(isEnabled);

			if (isEnabled) {
				executeSummary();
			}
		}, [executeSummary]),
	);

	return {
		isSummaryLoading: isLoading,
		summary,
		startSummary: executeSummary,
		category,
		errorMessage,
		isAutoSummaryEnabled,
	};
}
