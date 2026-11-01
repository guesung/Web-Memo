import * as Sentry from "@sentry/react";
import type { MemoInput } from "@src/types/Input";
import { useCategoryQuery, useTabQuery } from "@web-memo/shared/hooks";
import {
	analytics,
	type TCategoryChangeSource,
	type TCategorySuggestionTrigger,
} from "@web-memo/shared/modules/analytics";
import { getTabInfo, I18n } from "@web-memo/shared/utils/extension";
import { normalizeUrl } from "@web-memo/shared/utils/url";
import { toast } from "@web-memo/ui";
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
	type IFCategorySuggestion,
	requestCategorySuggestion,
} from "./requestCategorySuggestion";

/** 저장된 메모에 대한 카테고리 추천과 수락·거절 상태를 관리합니다. */
export const useCategorySuggestion = ({
	currentCategoryId,
	currentMemoId,
	firstSavedMemoId,
	isFirstSavedMemoReady,
	onCategorySelect,
}: IFUseCategorySuggestionProps) => {
	const [isLoading, setIsLoading] = useState(false);
	const [suggestion, setSuggestion] = useState<IFCategorySuggestion | null>(
		null,
	);
	const [isAccepting, setIsAccepting] = useState(false);
	const isAcceptingRef = useRef(false);
	const { getValues } = useFormContext<MemoInput>();
	const { categories } = useCategoryQuery();
	const { data: tab } = useTabQuery();
	const abortControllerRef = useRef<AbortController | null>(null);
	const requestSequenceRef = useRef(0);
	const dismissedUrlsRef = useRef(new Set<string>());
	const failedUrlsRef = useRef(new Set<string>());
	// 한 번 유효한 추천을 받지 못한 메모는 입력이 이어져도 다시 요청하지 않는다.
	const failedMemoIdsRef = useRef(new Set<number>());
	const currentUrlRef = useRef<string | null>(null);
	const suggestionMemoIdRef = useRef<number | null>(null);
	const firstSuggestedMemoIdRef = useRef<number | null>(null);
	const currentMemoIdRef = useRef(currentMemoId);
	currentMemoIdRef.current = currentMemoId;
	const suggestionRef = useRef<IFCategorySuggestion | null>(null);
	const dismissSuggestion = () => {
		const activeSuggestion = suggestionRef.current;
		if (!activeSuggestion) {
			return;
		}
		if (currentUrlRef.current) {
			dismissedUrlsRef.current.add(currentUrlRef.current);
		}
		analytics.trackEvent({
			name: "category_suggestion_dismiss",
			params: { source: "jev", is_new_category: false },
		});
		suggestionRef.current = null;
		setSuggestion(null);
	};
	const previousTabUrlRef = useRef(tab?.url);
	const previousMemoIdRef = useRef(currentMemoId);
	const acceptSuggestion = async (trigger: TCategorySuggestionTrigger) => {
		const activeSuggestion = suggestionRef.current;
		const isAlreadyAssigned = Boolean(getValues("categoryId"));
		if (!activeSuggestion || isAcceptingRef.current || isAlreadyAssigned) {
			return;
		}
		const activeUrl = currentUrlRef.current;
		const activeMemoId = suggestionMemoIdRef.current;
		isAcceptingRef.current = true;
		setIsAccepting(true);
		try {
			const currentTab = await getTabInfo();
			if (
				currentTab.url !== activeUrl ||
				currentMemoIdRef.current !== activeMemoId ||
				getValues("categoryId") ||
				suggestionRef.current !== activeSuggestion
			) {
				suggestionRef.current = null;
				setSuggestion(null);
				return;
			}
			onCategorySelect(activeSuggestion.existingCategoryId, "ai");
			analytics.trackEvent({
				name: "category_suggestion_apply",
				params: { source: "jev", is_new_category: false, trigger },
			});
			suggestionRef.current = null;
			setSuggestion(null);
		} catch (error) {
			Sentry.captureException(error);
			toast({ title: I18n.get("category_suggestion_apply_failed") });
		} finally {
			isAcceptingRef.current = false;
			setIsAccepting(false);
		}
	};
	const markMemoFailed = (memoId: number | null) => {
		if (memoId !== null) {
			failedMemoIdsRef.current.add(memoId);
		}
	};
	const triggerSuggestion = async (memoText: string) => {
		if (
			currentCategoryId ||
			suggestionRef.current ||
			isLoading ||
			!categories?.length
		) {
			return;
		}
		const requestedMemoId = currentMemoIdRef.current;
		if (
			requestedMemoId !== null &&
			failedMemoIdsRef.current.has(requestedMemoId)
		) {
			return;
		}
		firstSuggestedMemoIdRef.current = requestedMemoId;
		const requestSequence = ++requestSequenceRef.current;
		let requestedUrl: string | null = null;
		try {
			const tabInfo = await getTabInfo();
			if (
				!tabInfo.url ||
				dismissedUrlsRef.current.has(tabInfo.url) ||
				failedUrlsRef.current.has(tabInfo.url)
			) {
				return;
			}
			requestedUrl = tabInfo.url;
			const isRequestOutdated = async () => {
				const latestTab = await getTabInfo();
				return (
					requestSequence !== requestSequenceRef.current ||
					latestTab.url !== tabInfo.url ||
					// getTabInfo는 정규화한 URL을 준다. 탭 쿼리 값도 같은 규칙으로 맞춰야 해시·추적 파라미터가 있는 페이지의 응답을 버리지 않는다.
					!tab?.url ||
					normalizeUrl(tab.url) !== tabInfo.url ||
					currentMemoIdRef.current !== requestedMemoId ||
					Boolean(getValues("categoryId")) ||
					dismissedUrlsRef.current.has(tabInfo.url)
				);
			};
			currentUrlRef.current = tabInfo.url;
			abortControllerRef.current?.abort();
			const abortController = new AbortController();
			abortControllerRef.current = abortController;
			setIsLoading(true);
			const result = await requestCategorySuggestion({
				pageTitle: tabInfo.title || "",
				pageUrl: tabInfo.url,
				memoText,
				existingCategories: categories,
				abortController,
			});
			if (await isRequestOutdated()) {
				return;
			}
			if (
				!result ||
				result.source !== "jev" ||
				!result.isExisting ||
				!result.existingCategoryId ||
				!categories?.some(
					(category) => category.id === result.existingCategoryId,
				)
			) {
				failedUrlsRef.current.add(tabInfo.url);
				markMemoFailed(requestedMemoId);
				return;
			}
			analytics.trackEvent({
				name: "category_suggestion_show",
				params: { source: "jev", is_new_category: false },
			});
			suggestionRef.current = result;
			suggestionMemoIdRef.current = currentMemoIdRef.current;
			setSuggestion(result);
		} catch (error) {
			if (!(error instanceof Error && error.name === "AbortError")) {
				Sentry.captureException(error);
				if (requestedUrl && requestSequence === requestSequenceRef.current) {
					failedUrlsRef.current.add(requestedUrl);
					markMemoFailed(requestedMemoId);
				}
			}
		} finally {
			if (requestSequence === requestSequenceRef.current) {
				setIsLoading(false);
			}
		}
	};
	const triggerSuggestionRef = useRef(triggerSuggestion);
	triggerSuggestionRef.current = triggerSuggestion;
	useEffect(() => {
		if (previousTabUrlRef.current === tab?.url) {
			return;
		}
		previousTabUrlRef.current = tab?.url;
		requestSequenceRef.current += 1;
		abortControllerRef.current?.abort();
		suggestionRef.current = null;
		currentUrlRef.current = null;
		setSuggestion(null);
		setIsLoading(false);
	}, [tab?.url]);
	useEffect(() => {
		if (previousMemoIdRef.current === currentMemoId) {
			return;
		}
		previousMemoIdRef.current = currentMemoId;
		requestSequenceRef.current += 1;
		abortControllerRef.current?.abort();
		suggestionRef.current = null;
		suggestionMemoIdRef.current = null;
		setSuggestion(null);
		setIsLoading(false);
	}, [currentMemoId]);
	useEffect(() => {
		if (
			firstSavedMemoId === null ||
			currentMemoId !== firstSavedMemoId ||
			firstSuggestedMemoIdRef.current === firstSavedMemoId ||
			!isFirstSavedMemoReady ||
			currentCategoryId ||
			isLoading ||
			suggestion ||
			!categories?.length
		) {
			return;
		}

		const memoText = getValues("memo");
		if (memoText?.trim()) {
			void triggerSuggestionRef.current(memoText);
		}
	}, [
		firstSavedMemoId,
		currentMemoId,
		isFirstSavedMemoReady,
		currentCategoryId,
		isLoading,
		suggestion,
		categories?.length,
		getValues,
	]);
	useEffect(() => {
		return () => {
			requestSequenceRef.current += 1;
			abortControllerRef.current?.abort();
		};
	}, []);
	useEffect(() => {
		if (currentCategoryId) {
			suggestionRef.current = null;
			setSuggestion(null);
		}
	}, [currentCategoryId]);
	return {
		isLoading,
		suggestion,
		isAccepting,
		triggerSuggestion,
		acceptSuggestion,
		dismissSuggestion,
	};
};
/** 카테고리 추천 훅의 입력입니다. */
interface IFUseCategorySuggestionProps {
	currentCategoryId: number | null;
	currentMemoId: number | null;
	firstSavedMemoId: number | null;
	isFirstSavedMemoReady: boolean;
	onCategorySelect: (
		categoryId: number | null,
		source: TCategoryChangeSource,
	) => void;
}
