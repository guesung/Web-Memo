import { DEFAULT_PROMPTS, LANGUAGE_MAP, PROMPT } from "@src/constants";
import { ChromeSyncStorage, STORAGE_KEYS } from "@src/modules/chrome-storage";
import type { Category } from "@src/modules/extension-bridge";

interface GetSystemPromptProps {
	language: string;
	category: Category;
}

export const getSystemPrompt = async ({
	language,
	category,
}: GetSystemPromptProps) => {
	const youtubePrompts =
		(await ChromeSyncStorage.get(STORAGE_KEYS.youtubePrompts)) ??
		DEFAULT_PROMPTS.youtube;
	const webPrompts =
		(await ChromeSyncStorage.get(STORAGE_KEYS.webPrompts)) ??
		DEFAULT_PROMPTS.web;

	const languagePrompt =
		`${PROMPT.language} ${LANGUAGE_MAP[language] ?? "Korean"}`.repeat(3);

	if (category === "youtube")
		return `${youtubePrompts} ${languagePrompt} ${PROMPT.default}`;
	return `${webPrompts} ${languagePrompt} ${PROMPT.default}`;
};
