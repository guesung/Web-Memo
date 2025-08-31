import { CONFIG } from "@web-memo/env";
import { useFetch } from "@web-memo/shared/hooks";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { checkYoutubeUrl, extractVideoId } from "@web-memo/shared/utils";
import { getSystemPrompt, I18n, Tab } from "@web-memo/shared/utils/extension";
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
			const tabs = await Tab.get();
			if (!tabs?.url) return;

			const isYoutube = checkYoutubeUrl(tabs.url);

			if (isYoutube) {
				const youtubeId = extractVideoId(tabs.url);
				const response = await fetch(
					`${CONFIG.youtubeTranscriptUrl}/api/youtube-transcript?video_id=${youtubeId}`,
				);
				if (!response.ok) throw new Error("Failed to fetch transcript");

				const data = await response.json();
				pageContent = data.transcript;
				currentCategory = "youtube";
			} else {
				const { content } = await ExtensionBridge.requestPageContent();
				pageContent = content;
				currentCategory = "others";
			}

			setCategory(currentCategory);
		} catch {
			setErrorMessage(I18n.get("error_get_page_content"));
			return;
		}

		// 사용자 설정 프롬프트 생성
		const language = await ChromeSyncStorage.get<string>(STORAGE_KEYS.language);
		const systemPrompt = await getSystemPrompt({
			language: language || "ko",
			category: currentCategory,
		});

		// OpenAI API 메시지 형식으로 구성
		const messages = [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: pageContent },
		];

		try {
			const response = await fetch(`${CONFIG.webUrl}/api/openai`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					messages,
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			// 스트리밍 응답 처리
			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("Response body is not readable");
			}

			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6);
						if (data === "[DONE]") {
							return;
						}

						try {
							const parsed = JSON.parse(data);
							if (parsed.content) {
								setSummary((prev) => prev + parsed.content);
							} else if (parsed.error) {
								setErrorMessage(parsed.error);
								return;
							}
						} catch {
							// JSON 파싱 오류는 무시 (빈 줄 등)
						}
					}
				}
			}
		} catch (error) {
			console.error("Summary error:", error);
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
