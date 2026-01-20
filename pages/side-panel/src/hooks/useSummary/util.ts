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
import { DEFAULT_LANGUAGE } from "./constant";

interface GetSystemPromptProps {
	language: "ko" | "en";
	category: Category;
}

export const getSummaryPrompt = async (content: string, category: Category) => {
	const language = await ChromeSyncStorage.get<string>(STORAGE_KEYS.language);
	const validLanguage: "ko" | "en" =
		language === "ko" || language === "en" ? language : DEFAULT_LANGUAGE;
	const systemPrompt = await getSystemPrompt({
		language: validLanguage,
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

	if (category === "youtube")
		return `${DEFAULT_PROMPTS.youtube[language]} ${languagePrompt} ${PROMPT.default}`;
	return `${DEFAULT_PROMPTS.web[language]} ${languagePrompt} ${PROMPT.default}`;
};

export const processStreamingResponse = async (
	response: Response,
	onContentParsed: (content: string) => void,
	onError: (error: string) => void,
) => {
	const reader = response.body?.getReader();
	if (!reader) throw new Error("응답 본문을 읽을 수 없습니다");

	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() || "";

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
