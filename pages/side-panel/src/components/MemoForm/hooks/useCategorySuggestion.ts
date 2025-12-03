import { CONFIG } from "@web-memo/env";
import {
	useCategoryPostMutation,
	useCategoryQuery,
} from "@web-memo/shared/hooks";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { getTabInfo } from "@web-memo/shared/utils/extension";
import { useCallback, useEffect, useRef, useState } from "react";

const CONFIDENCE_THRESHOLD = 0.7;
const AUTO_DISMISS_DELAY = 15_000;
const API_TIMEOUT = 10000;
const PAGE_CONTENT_SAMPLE_LENGTH = 500;
const KOREAN_RATIO_THRESHOLD = 0.1;

function detectPageLanguage(
	pageTitle: string,
	pageContent: string,
): "ko" | "en" {
	const combined = `${pageTitle} ${pageContent.slice(0, PAGE_CONTENT_SAMPLE_LENGTH)}`;
	const koreanPattern = /[\uAC00-\uD7AF]/g;
	const koreanMatches = combined.match(koreanPattern);
	const koreanRatio = (koreanMatches?.length || 0) / combined.length;

	return koreanRatio > KOREAN_RATIO_THRESHOLD ? "ko" : "en";
}

export function useCategorySuggestion({
	currentCategoryId,
	onCategorySelect,
}: UseCategorySuggestionProps): UseCategorySuggestionReturn {
	const [isLoading, setIsLoading] = useState(false);
	const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);

	const { categories } = useCategoryQuery();
	const { mutateAsync: createCategory } = useCategoryPostMutation();

	const dismissedUrlsRef = useRef<Set<string>>(new Set());
	const currentUrlRef = useRef<string | null>(null);
	const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

	const applyCategorySuggestionDirect = useCallback(
		async (suggestionToApply: CategorySuggestion) => {
			try {
				let categoryId = suggestionToApply.existingCategoryId;

				if (!suggestionToApply.isExisting || !categoryId) {
					const result = await createCategory({
						name: suggestionToApply.categoryName,
					});

					categoryId = result.data?.[0]?.id ?? null;
				}

				if (categoryId) {
					onCategorySelect(categoryId);
				}
			} catch (error) {
				console.error("Failed to auto-apply category:", error);
			}
		},
		[createCategory, onCategorySelect],
	);

	const clearAutoDismissTimer = useCallback(() => {
		if (autoDismissTimerRef.current) {
			clearTimeout(autoDismissTimerRef.current);
			autoDismissTimerRef.current = null;
		}
	}, []);

	const reset = useCallback(() => {
		setSuggestion(null);
		setIsLoading(false);
		clearAutoDismissTimer();
	}, [clearAutoDismissTimer]);

	const dismissSuggestion = useCallback(() => {
		if (currentUrlRef.current) {
			dismissedUrlsRef.current.add(currentUrlRef.current);
		}
		reset();
	}, [reset]);

	const triggerSuggestion = useCallback(
		async (memoText: string) => {
			if (currentCategoryId) return;

			try {
				const tabInfo = await getTabInfo();
				if (!tabInfo.url) return;

				if (dismissedUrlsRef.current.has(tabInfo.url)) return;

				currentUrlRef.current = tabInfo.url;

				setIsLoading(true);

				let pageContent = "";
				try {
					const { content } = await ExtensionBridge.requestPageContent();
					pageContent = content || "";
				} catch {}

				const pageLanguage = detectPageLanguage(
					tabInfo.title || "",
					pageContent,
				);

				const existingCategories = (categories || []).map((c) => ({
					id: c.id,
					name: c.name,
				}));

				const timeoutPromise = new Promise<never>((_, reject) => {
					setTimeout(() => reject(new Error("Request timeout")), API_TIMEOUT);
				});

				const fetchPromise = fetch(`${CONFIG.webUrl}/api/openai/category`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						pageTitle: tabInfo.title || "",
						pageUrl: tabInfo.url,
						pageContent,
						memoText,
						existingCategories,
						pageLanguage,
					}),
				});

				const response = await Promise.race([fetchPromise, timeoutPromise]);

				if (!response.ok) {
					throw new Error(`HTTP error: ${response.status}`);
				}

				const data: CategorySuggestionResponse = await response.json();

				if (
					data.suggestion &&
					data.suggestion.confidence >= CONFIDENCE_THRESHOLD
				) {
					const suggestionData: CategorySuggestion = {
						...data.suggestion,
						existingCategoryId: data.suggestion.existingCategoryId ?? null,
					};

					setSuggestion(suggestionData);

					clearAutoDismissTimer();

					autoDismissTimerRef.current = setTimeout(() => {
						reset();
					}, AUTO_DISMISS_DELAY);
				}
			} catch (error) {
				if (error instanceof Error && error.name !== "AbortError") {
					console.error("Category suggestion error:", error);
				}
			} finally {
				setIsLoading(false);
			}
		},
		[categories, currentCategoryId, clearAutoDismissTimer, reset],
	);

	const acceptSuggestion = useCallback(async () => {
		if (!suggestion) return;
		await applyCategorySuggestionDirect(suggestion);
		reset();
	}, [suggestion, applyCategorySuggestionDirect, reset]);

	const triggerSuggestionByPageContent = useCallback(async () => {
		await triggerSuggestion("");
	}, [triggerSuggestion]);

	useEffect(() => {
		if (currentCategoryId) {
			reset();
		}
	}, [currentCategoryId, reset]);

	return {
		isLoading,
		suggestion,
		triggerSuggestion,
		triggerSuggestionByPageContent,
		acceptSuggestion,
		dismissSuggestion,
	};
}

interface CategorySuggestion {
	categoryName: string;
	isExisting: boolean;
	existingCategoryId: number | null;
	confidence: number;
}

interface CategorySuggestionResponse {
	suggestion: CategorySuggestion | null;
}

interface UseCategorySuggestionProps {
	currentCategoryId: number | null;
	onCategorySelect: (categoryId: number) => void;
}

interface UseCategorySuggestionReturn {
	isLoading: boolean;
	suggestion: CategorySuggestion | null;
	triggerSuggestion: (memoText: string) => void;
	triggerSuggestionByPageContent: () => Promise<void>;
	acceptSuggestion: () => Promise<void>;
	dismissSuggestion: () => void;
}
