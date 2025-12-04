import {
	DEFAULT_PROMPTS,
	LANGUAGE_MAP,
	PROMPT,
	STREAM_DATA_PREFIX,
	STREAM_DONE_MARKER,
} from "@web-memo/shared/constants";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { checkYoutubeUrl } from "@web-memo/shared/utils";
import { DEFAULT_CATEGORY, DEFAULT_LANGUAGE } from "./constant";

interface PageContentResult {
	content: string;
	category: Category;
}

interface GetSystemPromptProps {
	language: string;
	category: Category;
}

export const fetchYoutubeTranscript = async (): Promise<string> => {
	const result = await ExtensionBridge.requestYoutubeTranscript();

	if (!result.success) {
		throw new Error(result.error ?? "Failed to extract transcript");
	}

	return result.transcript;
};

export const getSummaryPrompt = async (content: string, category: Category) => {
	const language = await ChromeSyncStorage.get<string>(STORAGE_KEYS.language);
	const systemPrompt = await getSystemPrompt({
		language: language ?? DEFAULT_LANGUAGE,
		category,
	});

	return [
		{ role: "system", content: systemPrompt },
		{ role: "user", content: content },
	];
};

const getSystemPrompt = async ({
	language,
	category,
}: GetSystemPromptProps) => {
	const languagePrompt =
		`${PROMPT.language} ${LANGUAGE_MAP[language] ?? "Korean"}`.repeat(3);

	if (category === "youtube") {
		const youtubePrompts =
			(await ChromeSyncStorage.get(STORAGE_KEYS.youtubePrompts)) ??
			DEFAULT_PROMPTS.youtube;
		return `${youtubePrompts} ${languagePrompt} ${PROMPT.default}`;
	}

	const webPrompts =
		(await ChromeSyncStorage.get(STORAGE_KEYS.webPrompts)) ??
		DEFAULT_PROMPTS.web;
	return `${webPrompts} ${languagePrompt} ${PROMPT.default}`;
};

export const getPageContent = async (
	url: string,
): Promise<PageContentResult> => {
	const isYoutube = checkYoutubeUrl(url);

	if (isYoutube) {
		const transcript = await fetchYoutubeTranscript();
		return {
			content: transcript,
			category: "youtube",
		};
	}

	const { content } = await ExtensionBridge.requestPageContent();
	return {
		content,
		category: DEFAULT_CATEGORY,
	};
};

export const processStreamingResponse = async (
	response: Response,
	onContentParsed: (content: string) => void,
	onError: (error: string) => void,
) => {
	const reader = response.body?.getReader();
	if (!reader) throw new Error("응답 본문을 읽을 수 없습니다");

	const decoder = new TextDecoder();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		const chunk = decoder.decode(value);
		const lines = chunk.split("\n");

		for (const line of lines) {
			if (line.startsWith(STREAM_DATA_PREFIX)) {
				const data = line.slice(STREAM_DATA_PREFIX.length);
				if (data === STREAM_DONE_MARKER) return;

				try {
					const parsed = JSON.parse(data);
					if (parsed.content) {
						onContentParsed(parsed.content);
					} else if (parsed.error) {
						onError(parsed.error);
						return;
					}
				} catch {
					// JSON 파싱 오류는 무시 (빈 줄 등)
				}
			}
		}
	}
};
