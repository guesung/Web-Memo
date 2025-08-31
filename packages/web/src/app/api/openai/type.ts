// Types
export type ChatCompletionMessageParam = {
	role: "system" | "user" | "assistant";
	content: string;
};

export interface ValidationResult {
	isValid: boolean;
	error?: string;
}
