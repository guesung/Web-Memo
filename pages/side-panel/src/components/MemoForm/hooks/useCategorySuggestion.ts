import { CONFIG } from "@web-memo/env";
import {
	useCategoryPostMutation,
	useCategoryQuery,
} from "@web-memo/shared/hooks";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { getTabInfo } from "@web-memo/shared/utils/extension";
import { useCallback, useEffect, useRef, useState } from "react";

const CONFIDENCE_THRESHOLD = 0.7;
const AUTO_DISMISS_DELAY = 15000;
const API_TIMEOUT = 10000;
const PAGE_CONTENT_SAMPLE_LENGTH = 500;
const KOREAN_RATIO_THRESHOLD = 0.1;

export const MIN_MEMO_LENGTH = 20;

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

	const abortControllerRef = useRef<AbortController | null>(null);
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
			// Guard conditions
			if (currentCategoryId) return;
			if (memoText.length < MIN_MEMO_LENGTH) return;

			try {
				const tabInfo = await getTabInfo();
				if (!tabInfo.url) return;

				// Check if URL was dismissed in this session
				if (dismissedUrlsRef.current.has(tabInfo.url)) return;

				currentUrlRef.current = tabInfo.url;

				// Cancel previous request
				abortControllerRef.current?.abort();
				abortControllerRef.current = new AbortController();

				setIsLoading(true);

				// Get page content
				let pageContent = "";
				try {
					const { content } = await ExtensionBridge.requestPageContent();
					pageContent = content || "";
				} catch {
					// Silent fail - use empty content
				}

				const pageLanguage = detectPageLanguage(
					tabInfo.title || "",
					pageContent,
				);

				const existingCategories = (categories || []).map((c) => ({
					id: c.id,
					name: c.name,
				}));

				// Create timeout promise
				const timeoutPromise = new Promise<never>((_, reject) => {
					setTimeout(() => reject(new Error("Request timeout")), API_TIMEOUT);
				});

				// Fetch with timeout
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
					signal: abortControllerRef.current.signal,
				});

				const response = await Promise.race([fetchPromise, timeoutPromise]);

				if (!response.ok) {
					throw new Error(`HTTP error: ${response.status}`);
				}

				const data: CategorySuggestionResponse = await response.json();

				// Only show if confidence is above threshold
				if (
					data.suggestion &&
					data.suggestion.confidence >= CONFIDENCE_THRESHOLD
				) {
					const suggestionData: CategorySuggestion = {
						...data.suggestion,
						existingCategoryId: data.suggestion.existingCategoryId ?? null,
					};

					// Check if auto-apply is enabled
					const shouldAutoApply =
						(await ChromeSyncStorage.get<boolean>(
							STORAGE_KEYS.autoApplyCategory,
						)) ?? true;

					if (shouldAutoApply) {
						// Auto-apply the suggestion without showing UI
						await applyCategorySuggestionDirect(suggestionData);
					} else {
						// Show suggestion UI for manual approval
						setSuggestion(suggestionData);

						// Set auto-dismiss timer
						clearAutoDismissTimer();
						autoDismissTimerRef.current = setTimeout(() => {
							reset();
						}, AUTO_DISMISS_DELAY);
					}
				}
			} catch (error) {
				// Silent fail - don't disrupt user
				if (error instanceof Error && error.name !== "AbortError") {
					console.error("Category suggestion error:", error);
				}
			} finally {
				setIsLoading(false);
			}
		},
		[
			categories,
			currentCategoryId,
			clearAutoDismissTimer,
			reset,
			applyCategorySuggestionDirect,
		],
	);

	const acceptSuggestion = useCallback(async () => {
		if (!suggestion) return;
		await applyCategorySuggestionDirect(suggestion);
		reset();
	}, [suggestion, applyCategorySuggestionDirect, reset]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			abortControllerRef.current?.abort();
			clearAutoDismissTimer();
		};
	}, [clearAutoDismissTimer]);

	// Reset when category is manually selected
	useEffect(() => {
		if (currentCategoryId) {
			reset();
		}
	}, [currentCategoryId, reset]);

	return {
		isLoading,
		suggestion,
		triggerSuggestion,
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
	acceptSuggestion: () => Promise<void>;
	dismissSuggestion: () => void;
}
