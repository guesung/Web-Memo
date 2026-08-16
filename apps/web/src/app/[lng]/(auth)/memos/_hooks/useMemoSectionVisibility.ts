"use client";

import { useCallback, useSyncExternalStore } from "react";

/** 느낀 점 입력란 노출 여부를 저장하는 localStorage 키 */
const IMPRESSION_SECTION_ENABLED_KEY = "webmemo:impression-section-enabled";
/** 액션 아이템 입력란 노출 여부를 저장하는 localStorage 키 */
const ACTION_ITEM_SECTION_ENABLED_KEY = "webmemo:action-item-section-enabled";

/** 설정 변경을 같은 탭의 다른 컴포넌트에 알리는 커스텀 이벤트 이름 */
const MEMO_SECTION_VISIBILITY_CHANGE_EVENT = "webmemo:memo-section-visibility";

/**
 * 메모 폼의 느낀 점·액션 아이템 입력란 노출 여부
 */
export interface IFMemoSectionVisibility {
	/** 느낀 점 입력란 노출 여부 */
	isImpressionSectionEnabled: boolean;
	/** 액션 아이템 입력란 노출 여부 */
	isActionItemSectionEnabled: boolean;
}

const getStoredFlag = (key: string): boolean => {
	if (typeof window === "undefined") {
		return true;
	}

	return window.localStorage.getItem(key) !== "false";
};

const subscribeToVisibilityChange = (onStoreChange: () => void) => {
	window.addEventListener(MEMO_SECTION_VISIBILITY_CHANGE_EVENT, onStoreChange);
	window.addEventListener("storage", onStoreChange);

	return () => {
		window.removeEventListener(
			MEMO_SECTION_VISIBILITY_CHANGE_EVENT,
			onStoreChange,
		);
		window.removeEventListener("storage", onStoreChange);
	};
};

/**
 * 설정에서 지정한 느낀 점·액션 아이템 입력란 노출 여부를 읽고 변경하는 훅.
 * @description localStorage 에 저장하며, 같은 탭의 다른 컴포넌트에는 커스텀 이벤트로,
 * 다른 탭에는 storage 이벤트로 즉시 전파된다. 서버 렌더링 시에는 기본값(표시)을 반환한다.
 */
export default function useMemoSectionVisibility() {
	const isImpressionSectionEnabled = useSyncExternalStore(
		subscribeToVisibilityChange,
		() => getStoredFlag(IMPRESSION_SECTION_ENABLED_KEY),
		() => true,
	);
	const isActionItemSectionEnabled = useSyncExternalStore(
		subscribeToVisibilityChange,
		() => getStoredFlag(ACTION_ITEM_SECTION_ENABLED_KEY),
		() => true,
	);

	const setImpressionSectionEnabled = useCallback((isEnabled: boolean) => {
		window.localStorage.setItem(
			IMPRESSION_SECTION_ENABLED_KEY,
			String(isEnabled),
		);
		window.dispatchEvent(new Event(MEMO_SECTION_VISIBILITY_CHANGE_EVENT));
	}, []);

	const setActionItemSectionEnabled = useCallback((isEnabled: boolean) => {
		window.localStorage.setItem(
			ACTION_ITEM_SECTION_ENABLED_KEY,
			String(isEnabled),
		);
		window.dispatchEvent(new Event(MEMO_SECTION_VISIBILITY_CHANGE_EVENT));
	}, []);

	return {
		isImpressionSectionEnabled,
		isActionItemSectionEnabled,
		setImpressionSectionEnabled,
		setActionItemSectionEnabled,
	};
}
