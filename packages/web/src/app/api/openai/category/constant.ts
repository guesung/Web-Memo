export const OPENAI_MODEL = "gpt-4o-mini" as const;

export const OPENAI_SETTINGS = {
	temperature: 0.3,
	responseFormat: { type: "json_object" } as const,
} as const;

export const SYSTEM_MESSAGE =
	"You are a helpful assistant that categorizes web pages and memos. Always respond with valid JSON only, no markdown formatting.";

export const PAGE_CONTENT_MAX_LENGTH = 2000;
