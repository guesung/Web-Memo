export interface CategorySuggestionRequest {
	pageTitle: string;
	pageUrl: string;
	pageContent: string;
	memoText: string;
	existingCategories: { id: number; name: string }[];
	pageLanguage: string;
}

export interface CategorySuggestionResponse {
	suggestion: {
		categoryName: string;
		isExisting: boolean;
		existingCategoryId?: number;
		confidence: number;
	} | null;
}

export interface ParsedAIResponse {
	categoryName: string;
	isExisting: boolean;
	confidence: number;
}
