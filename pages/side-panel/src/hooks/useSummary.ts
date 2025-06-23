import { useFetch } from "@web-memo/shared/hooks";
import type { Category } from "@web-memo/shared/modules/extension-bridge";
import {
    BRIDGE_MESSAGE_TYPES,
    ExtensionBridge,
} from "@web-memo/shared/modules/extension-bridge";
import { I18n, Runtime } from "@web-memo/shared/utils/extension";
import { useState } from "react";

export default function useSummary() {
	const [summary, setSummary] = useState("");
	const [category, setCategory] = useState<Category>("others");
	const [errorMessage, setErrorMessage] = useState("");

	const startSummary = async () => {
		setSummary("");
		setCategory("others");
		setErrorMessage("");

		let pageContent = "";
		let currentCategory: Category = "others";
		try {
			const { content, category } = await ExtensionBridge.requestPageContent();
			pageContent = content;
			currentCategory = category;
			setCategory(category);
		} catch (e) {
			setErrorMessage(I18n.get("error_get_page_content"));
			return;
		}
		try {
			await Runtime.connect(
				BRIDGE_MESSAGE_TYPES.GET_SUMMARY,
				{ pageContent, category: currentCategory },
				(message: string) => message && setSummary((prev) => prev + message),
			);
		} catch (e) {
			setErrorMessage(I18n.get("error_get_summary"));
			setCategory("others");
			return;
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
