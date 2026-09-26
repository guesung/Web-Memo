/** 카테고리 추천 요청에 필요한 페이지와 메모 데이터입니다. */
export interface IFCategorySuggestionRequest {
	pageTitle: string;
	pageUrl: string;
	pageContent: string;
	memoText: string;
	existingCategories: { id: number; name: string }[];
	pageLanguage: string;
}

/** 기존 확장과 호환되는 카테고리 추천 응답입니다. */
export interface IFCategorySuggestionResponse {
	suggestion: {
		categoryName: string;
		isExisting: boolean;
		existingCategoryId?: number;
		confidence: number;
		source: "jev" | "llm";
	} | null;
}

/** LLM의 JSON 응답을 파싱한 결과입니다. */
export interface IFParsedAIResponse {
	categoryName: string;
	isExisting: boolean;
	confidence: number;
}
