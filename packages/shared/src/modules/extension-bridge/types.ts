import type { Category } from "./constant";

export interface PageContent {
	content: string;
	category: Category;
}

export interface CreateMemoPayload {
	memo: string;
	url: string;
	title: string;
	favIconUrl: string;
	isWish: boolean;
	category_id: number | null;
}

export interface CreateMemoResponse {
	success: boolean;
	error?: string;
}

export interface YoutubeTranscriptResponse {
	success: boolean;
	transcript: string;
	error?: string;
}
