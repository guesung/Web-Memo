import { CONFIG } from "@web-memo/env";
import { bridge } from "@web-memo/shared/modules/extension-bridge";

const API_TIMEOUT = 10000;
const PAGE_CONTENT_SAMPLE_LENGTH = 500;
const KOREAN_RATIO_THRESHOLD = 0.1;

/** 현재 페이지와 메모를 서버 판정 API에 보내 카테고리 제안을 받습니다. */
export const requestCategorySuggestion = async ({
	pageTitle,
	pageUrl,
	memoText,
	existingCategories,
	abortController,
}: IFRequestCategorySuggestionParams): Promise<IFCategorySuggestion | null> => {
	let pageContent = "";
	try {
		const page = await bridge.request.PAGE_CONTENT();
		pageContent = page.content || "";
	} catch {
		// 접근할 수 없는 페이지에서도 메모와 제목만으로 추천합니다.
	}
	const existingCategoryOptions = (existingCategories || []).map(
		(category) => ({
			id: category.id,
			name: category.name,
		}),
	);
	const pageLanguage = detectPageLanguage(pageTitle, pageContent);
	let didTimeOut = false;
	const timeout = setTimeout(() => {
		didTimeOut = true;
		abortController.abort();
	}, API_TIMEOUT);
	try {
		const response = await fetch(`${CONFIG.webUrl}/api/openai/category`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				pageTitle,
				pageUrl,
				pageContent,
				memoText,
				existingCategories: existingCategoryOptions,
				pageLanguage,
			}),
			signal: abortController.signal,
		});
		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}
		const data: IFCategorySuggestionResponse = await response.json();

		return data.suggestion;
	} catch (error) {
		if (didTimeOut) {
			throw new Error("Category suggestion request timeout", { cause: error });
		}
		throw error;
	} finally {
		clearTimeout(timeout);
	}
};

const detectPageLanguage = (
	pageTitle: string,
	pageContent: string,
): "ko" | "en" => {
	const combined = `${pageTitle} ${pageContent.slice(0, PAGE_CONTENT_SAMPLE_LENGTH)}`;
	const koreanMatches = combined.match(/[\uAC00-\uD7AF]/g);
	const koreanRatio = (koreanMatches?.length || 0) / combined.length;

	return koreanRatio > KOREAN_RATIO_THRESHOLD ? "ko" : "en";
};

/** 추천 요청에 필요한 페이지·카테고리 데이터입니다. */
interface IFRequestCategorySuggestionParams {
	pageTitle: string;
	pageUrl: string;
	memoText: string;
	existingCategories: { id: number; name: string }[] | null | undefined;
	abortController: AbortController;
}

/** 서버 추천 응답입니다. */
interface IFCategorySuggestionResponse {
	suggestion: IFCategorySuggestion | null;
}

/** 카테고리 추천 API의 제안 데이터입니다. */
export interface IFCategorySuggestion {
	categoryName: string;
	isExisting: boolean;
	existingCategoryId: number | null;
	confidence: number;
	source?: "jev" | "llm";
}
