import type { MemoInput } from "@src/types/Input";
import { CONFIG } from "@web-memo/env";
import {
	useCategoryPostMutation,
	useCategoryQuery,
} from "@web-memo/shared/hooks";
import {
	analytics,
	type TCategoryChangeSource,
} from "@web-memo/shared/modules/analytics";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { generateRandomPastelColor } from "@web-memo/shared/utils";
import { getTabInfo } from "@web-memo/shared/utils/extension";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";

const CONFIDENCE_THRESHOLD = 0.7;
const AUTO_DISMISS_DELAY = 15000;
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
}: UseCategorySuggestionProps) {
	const [isLoading, setIsLoading] = useState(false);

	const { getValues } = useFormContext<MemoInput>();
	const { categories } = useCategoryQuery();
	const { mutateAsync: createCategory } = useCategoryPostMutation();

	const abortControllerRef = useRef<AbortController | null>(null);
	const dismissedUrlsRef = useRef<Set<string>>(new Set());
	const currentUrlRef = useRef<string | null>(null);
	const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

	const applyCategorySuggestionDirect = useCallback(
		async (suggestionToApply: CategorySuggestion) => {
			// 추천을 기다리는 사이 사용자가 직접 골랐거나 이 페이지에서 해제했으면 결과를 버린다.
			// 요청 시점의 값이 아니라 결과가 도착한 지금의 폼 값을 봐야 한다.
			const isSuggestionOutdated = () => {
				const hasUserChosenCategory = !!getValues("categoryId");
				const isDismissedUrl =
					currentUrlRef.current !== null &&
					dismissedUrlsRef.current.has(currentUrlRef.current);

				return hasUserChosenCategory || isDismissedUrl;
			};

			try {
				if (isSuggestionOutdated()) {
					return;
				}

				let categoryId = suggestionToApply.existingCategoryId;

				if (!suggestionToApply.isExisting || !categoryId) {
					try {
						const result = await createCategory({
							name: suggestionToApply.categoryName,
							color: generateRandomPastelColor(),
						});
						categoryId = result.data?.[0]?.id ?? null;
					} catch {
						const existing = categories?.find(
							(c) =>
								c.name.toLowerCase() ===
								suggestionToApply.categoryName.toLowerCase(),
						);
						if (existing) categoryId = existing.id;
					}
				}

				// 카테고리를 만드는 동안에도 사용자가 고를 수 있으므로 적용 직전에 한 번 더 본다.
				if (categoryId && !isSuggestionOutdated()) {
					onCategorySelect(categoryId, "ai");
					// OpenAI를 호출하는 기능입니다. 제안이 실제로 받아들여지는지 모르면 비용 대비
					// 가치를 판단할 수 없습니다.
					analytics.trackEvent({
						name: "category_suggestion_apply",
						params: { is_new_category: !suggestionToApply.isExisting },
					});
				}
			} catch (error) {
				console.error("Failed to auto-apply category:", error);
			}
		},
		[createCategory, onCategorySelect, categories, getValues],
	);

	const clearAutoDismissTimer = useCallback(() => {
		if (autoDismissTimerRef.current) {
			clearTimeout(autoDismissTimerRef.current);
			autoDismissTimerRef.current = null;
		}
	}, []);

	const reset = useCallback(() => {
		setIsLoading(false);
		clearAutoDismissTimer();
	}, [clearAutoDismissTimer]);

	const triggerSuggestion = useCallback(
		async (memoText: string) => {
			if (currentCategoryId) return;

			try {
				const tabInfo = await getTabInfo();
				if (!tabInfo.url) return;

				if (dismissedUrlsRef.current.has(tabInfo.url)) return;

				currentUrlRef.current = tabInfo.url;

				abortControllerRef.current?.abort();
				abortControllerRef.current = new AbortController();

				setIsLoading(true);

				let pageContent = "";
				try {
					const { content } = await bridge.request.PAGE_CONTENT();
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
					signal: abortControllerRef.current.signal,
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

					analytics.trackEvent({
						name: "category_suggestion_show",
						params: { is_new_category: !suggestionData.isExisting },
					});

					const shouldAutoApply =
						(await ChromeSyncStorage.get<boolean>(
							STORAGE_KEYS.autoApplyCategory,
						)) ?? true;

					if (shouldAutoApply) {
						await applyCategorySuggestionDirect(suggestionData);
					} else {
						clearAutoDismissTimer();
						autoDismissTimerRef.current = setTimeout(() => {
							reset();
						}, AUTO_DISMISS_DELAY);
					}
				}
			} catch (error) {
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

	// MemoForm은 페이지가 바뀌면 다시 마운트된다. 진행 중인 추천은 끊지 않고 끝까지 받아
	// 요청 시점의 메모(원래 페이지)에 적용한다.
	useEffect(() => {
		return () => {
			clearAutoDismissTimer();
		};
	}, [clearAutoDismissTimer]);

	useEffect(() => {
		if (currentCategoryId) {
			reset();
		}
	}, [currentCategoryId, reset]);

	/**
	 * 현재 탭 URL에서 AI 추천 자동 적용을 멈춘다.
	 * @description 사용자가 카테고리를 직접 해제한 페이지에 추천이 다시 덮어쓰지 않게 한다.
	 * 기록은 패널이 열려 있는 동안만 유지된다.
	 */
	const dismissCurrentUrl = async () => {
		const tabInfo = await getTabInfo();

		if (tabInfo.url) {
			dismissedUrlsRef.current.add(tabInfo.url);
		}
	};

	return {
		isLoading,
		triggerSuggestion,
		dismissCurrentUrl,
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
	onCategorySelect: (categoryId: number, source: TCategoryChangeSource) => void;
}
