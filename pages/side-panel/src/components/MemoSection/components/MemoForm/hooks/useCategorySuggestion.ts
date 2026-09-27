import * as Sentry from "@sentry/react";
import type { MemoInput } from "@src/types/Input";
import { useCategoryQuery, useTabQuery } from "@web-memo/shared/hooks";
import {
	analytics,
	type TCategoryChangeSource,
} from "@web-memo/shared/modules/analytics";
import { getTabInfo, I18n } from "@web-memo/shared/utils/extension";
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
	const acceptSuggestion = async () => {
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
				params: { source: "jev", is_new_category: false },
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
	const triggerSuggestion = async (memoText: string) => {
		if (
			currentCategoryId ||
			suggestionRef.current ||
			isLoading ||
			!categories?.length
		) {
			return;
		}
		firstSuggestedMemoIdRef.current = currentMemoIdRef.current;
		const requestSequence = ++requestSequenceRef.current;
		try {
			const tabInfo = await getTabInfo();
			if (!tabInfo.url || dismissedUrlsRef.current.has(tabInfo.url)) {
				return;
			}
			const requestedMemoId = currentMemoIdRef.current;
			const isRequestOutdated = async () => {
				const latestTab = await getTabInfo();
				return (
					requestSequence !== requestSequenceRef.current ||
					latestTab.url !== tabInfo.url ||
					tab?.url !== tabInfo.url ||
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
