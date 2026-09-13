import { useQueryClient } from "@tanstack/react-query";
import { CONFIG } from "@web-memo/env";
import {
	useCategoryPostMutation,
	useCategoryQuery,
} from "@web-memo/shared/hooks";
import {
	hasPaidSubscription,
	useSubscriptionQuery,
} from "@web-memo/shared/hooks/billing";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { generateRandomPastelColor } from "@web-memo/shared/utils";
import { getTabInfo } from "@web-memo/shared/utils/extension";
import { useEffect, useRef, useState } from "react";
import { requestAi } from "../../../../../utils/aiRequest";

/** 편집 중인 카테고리와 결과 적용 콜백입니다. */
interface IFCategorySuggestionProps {
	currentCategoryId: number | null;
	onCategorySelect: (categoryId: number) => void;
}
/** 서버의 카테고리 분류 응답입니다. */
interface IFCategorySuggestion {
	categoryName: string;
	isExisting: boolean;
	existingCategoryId: number | null;
	confidence: number;
}

/** 유료 사용자가 자동 적용을 허용한 경우에만 페이지당 한 번 분류합니다. */
export const useCategorySuggestion = (props: IFCategorySuggestionProps) => {
	const [isLoading, setIsLoading] = useState(false);
	const { categories } = useCategoryQuery();
	const { mutateAsync: createCategory } = useCategoryPostMutation();
	const subscriptionQuery = useSubscriptionQuery(CONFIG.webUrl);
	const queryClient = useQueryClient();
	const controllerRef = useRef<AbortController | null>(null);
	const requestedUrlsRef = useRef(new Set<string>());
	const currentCategoryRef = useRef(props.currentCategoryId);
	currentCategoryRef.current = props.currentCategoryId;
	useEffect(() => () => controllerRef.current?.abort(), []);
	const triggerSuggestion = async (memoText: string) => {
		if (
			currentCategoryRef.current ||
			controllerRef.current ||
			!hasPaidSubscription(subscriptionQuery.data?.subscription ?? null)
		) {
			return;
		}
		const shouldAutoApply =
			(await ChromeSyncStorage.get<boolean>(STORAGE_KEYS.autoApplyCategory)) ??
			true;
		if (!shouldAutoApply) {
			return;
		}
		const tabInfo = await getTabInfo();
		if (!tabInfo.url || requestedUrlsRef.current.has(tabInfo.url)) {
			return;
		}
		const controller = new AbortController();
		controllerRef.current = controller;
		requestedUrlsRef.current.add(tabInfo.url);
		setIsLoading(true);
		const timeoutId = setTimeout(() => controller.abort(), 10000);
		try {
			const page = await bridge.request.PAGE_CONTENT();
			const response = await requestAi({
				path: "/category",
				body: {
					pageTitle: tabInfo.title || "",
					pageUrl: tabInfo.url,
					pageContent: page.content || "",
					memoText,
					pageLanguage: /[가-힣]/.test(
						`${tabInfo.title} ${page.content?.slice(0, 500)}`,
					)
						? "ko"
						: "en",
					existingCategories: (categories ?? []).map((category) => ({
						id: category.id,
						name: category.name,
					})),
				},
				signal: controller.signal,
			});
			const result: { suggestion: IFCategorySuggestion | null } =
				await response.json();
			const suggestion = result.suggestion;
			if (
				!suggestion ||
				suggestion.confidence < 0.7 ||
				currentCategoryRef.current ||
				(await getTabInfo()).url !== tabInfo.url
			) {
				return;
			}
			let categoryId = suggestion.existingCategoryId;
			if (!suggestion.isExisting || !categoryId) {
				const categoryResult = await createCategory({
					name: suggestion.categoryName,
					color: generateRandomPastelColor(),
				});
				categoryId = categoryResult.data?.[0]?.id ?? null;
			}
			if (
				categoryId &&
				!currentCategoryRef.current &&
				(await getTabInfo()).url === tabInfo.url
			) {
				props.onCategorySelect(categoryId);
			}
		} catch {
			/** AI 실패 시 일반 메모와 사용자가 선택한 카테고리를 유지합니다. */
		} finally {
			clearTimeout(timeoutId);
			controllerRef.current = null;
			setIsLoading(false);
			await queryClient.invalidateQueries({ queryKey: ["billing"] });
		}
	};

	return { isLoading, triggerSuggestion };
};
