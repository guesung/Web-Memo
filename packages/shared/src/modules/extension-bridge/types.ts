import type { HighlightRow } from "../../types";
import type { Category } from "./constant";

export interface PageContentResponse {
	content: string;
	category: Category;
	title: string;
	favicon: string;
}

export interface PageContent {
	content: string;
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

/** content script가 background에 넘기는 조회 대상 URL. 정규화는 background가 한다 */
export interface GetHighlightsByUrlPayload {
	url: string;
}

/** 조회 결과. 실패해도 빈 배열을 돌려준다 — 복원은 조용히 실패해야 한다 */
export interface GetHighlightsByUrlResponse {
	highlights: HighlightRow[];
}
