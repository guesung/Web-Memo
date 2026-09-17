import {
	STREAM_DATA_PREFIX,
	STREAM_DONE_MARKER,
} from "@web-memo/shared/constants";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { DEFAULT_LANGUAGE, LANGUAGE_NAME } from "./constant";
import { DEFAULT_PROMPTS, PROMPT } from "./prompt";

interface GetSystemPromptProps {
	language: "ko" | "en";
	category: Category;
}

type StreamFailureStage = "reader" | "parse" | "server";

type StreamErrorHandler = (
	error: string,
	streamFailureStage: StreamFailureStage,
) => void;

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
	const languagePrompt = `${PROMPT.language} ${LANGUAGE_NAME[language]}`.repeat(
		3,
	);

	if (category === "youtube")
		return `${DEFAULT_PROMPTS.youtube[language]} ${languagePrompt} ${PROMPT.default}`;
	return `${DEFAULT_PROMPTS.web[language]} ${languagePrompt} ${PROMPT.default}`;
};

export const processStreamingResponse = async (
	response: Response,
	onContentParsed: (content: string) => void,
	onError: StreamErrorHandler,
) => {
	const reader = response.body?.getReader();
	if (!reader) {
		onError("요약 응답 본문을 읽을 수 없습니다.", "reader");
		return;
	}

	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		let done = false;
		let value: Uint8Array | undefined;

		try {
			const readResult = await reader.read();
			done = readResult.done;
			value = readResult.value;
		} catch (error) {
			onError(
				error instanceof Error
					? error.message
					: "요약 응답을 읽는 중 오류가 발생했습니다.",
				"reader",
			);
			return;
		}

		if (done) break;
		if (!value) continue;

		try {
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
							onError(parsed.error, "server");
							return;
						}
					} catch {
						onError("요약 스트림 파싱 실패", "parse");
						return;
					}
				}
			}
		} catch {
			onError("요약 스트림 파싱 실패", "parse");
			return;
		}
	}
};
