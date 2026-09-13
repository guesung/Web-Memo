import { useQueryClient } from "@tanstack/react-query";
import { analytics } from "@web-memo/shared/modules/analytics";
import { I18n } from "@web-memo/shared/utils/extension";
import { useRef, useState } from "react";
import { usePageContentContext } from "../../components/PageContentProvider";
import { requestAi } from "../../utils/aiRequest";
import { getSummaryPrompt, processStreamingResponse } from "./util";

/** 요약 실패 시 기존 결과를 보존하며 인증된 요청만 실행합니다. */
const useSummary = () => {
	const [summary, setSummary] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const isGeneratingRef = useRef(false);
	const page = usePageContentContext();
	const queryClient = useQueryClient();
	const generateSummary = async () => {
		if (isGeneratingRef.current) {
			return;
		}
		if (page.error || !page.content.trim()) {
			setErrorMessage(I18n.get("error_get_page_content"));
			return;
		}
		isGeneratingRef.current = true;
		setIsGenerating(true);
		setErrorMessage("");
		let nextSummary = "";
		try {
			const messages = await getSummaryPrompt(page.content, page.category);
			const response = await requestAi({ path: "", body: { messages } });
			analytics.trackEvent({ name: "summary_run" });
			await processStreamingResponse(
				response,
				(chunk) => {
					nextSummary += chunk;
					setSummary(nextSummary);
				},
				(message) => setErrorMessage(message),
			);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : I18n.get("billing_ai_failed"),
			);
		} finally {
			isGeneratingRef.current = false;
			setIsGenerating(false);
			await queryClient.invalidateQueries({ queryKey: ["billing"] });
		}
	};

	return {
		summary,
		errorMessage,
		isSummaryLoading: isGenerating,
		generateSummary,
	};
};

export default useSummary;
