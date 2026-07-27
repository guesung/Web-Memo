export const OPENAI_MODEL = "gpt-4o-mini" as const;

export const OPENAI_SETTINGS = {
	temperature: 0.3,
} as const;

export const PAGE_CONTENT_MAX_LENGTH = 12000;

export const SUMMARIZE_SYSTEM_MESSAGE =
	"You are a helpful assistant that summarizes web articles in Korean. Write a concise summary in 3-5 bullet points, in Korean, no markdown headers.";

export const QA_SYSTEM_MESSAGE =
	"You are a helpful assistant that answers questions about a web article's content, in Korean. If the article does not contain the answer, say so honestly.";
