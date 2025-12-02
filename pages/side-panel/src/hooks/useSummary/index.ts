import { CONFIG } from "@web-memo/env";
import { useFetch } from "@web-memo/shared/hooks";
import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { checkYoutubeUrl, extractVideoId } from "@web-memo/shared/utils";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import { useRef, useState } from "react";
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
}

async function saveYoutubeSummaryForSEO(
	videoId: string,
	videoUrl: string,
	summary: string,
): Promise<void> {
	try {
		await fetch(`${CONFIG.webUrl}/api/youtube-summary`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				video_id: videoId,
				video_url: videoUrl,
				summary_text: summary,
				language: "ko",
			}),
		});
	} catch (error) {
		console.error("Failed to save YouTube summary for SEO:", error);
	}
}

export default function useSummary(): UseSummaryReturn {
	const [summary, setSummary] = useState("");
	const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
	const [errorMessage, setErrorMessage] = useState("");
	const summaryRef = useRef("");
	const currentUrlRef = useRef("");

	const resetSummaryState = () => {
		setSummary("");
		summaryRef.current = "";
		setCategory(DEFAULT_CATEGORY);
		setErrorMessage("");
	};

	const startSummary = async () => {
		resetSummaryState();

		try {
			const tabs = await Tab.get();
			if (!tabs?.url) return;

			currentUrlRef.current = tabs.url;

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
					summaryRef.current += content;
					setSummary((prev) => prev + content);
				},
				(error) => {
					setErrorMessage(error);
					setCategory(DEFAULT_CATEGORY);
				},
			);

			if (
				currentCategory === "youtube" &&
				summaryRef.current &&
				checkYoutubeUrl(currentUrlRef.current)
			) {
				const videoId = extractVideoId(currentUrlRef.current);
				if (videoId) {
					saveYoutubeSummaryForSEO(
						videoId,
						currentUrlRef.current,
						summaryRef.current,
					);
				}
			}
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
	};
}
