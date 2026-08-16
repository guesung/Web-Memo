import { useEffect, useState } from "react";
import { ChromeSyncStorage, STORAGE_KEYS } from "../../modules/chrome-storage";

/**
 * 메모 폼의 느낀 점·액션 아이템 입력란 노출 여부
 */
export interface IFMemoSectionVisibility {
	/** 느낀 점 입력란 노출 여부 */
	isImpressionSectionEnabled: boolean;
	/** 액션 아이템 입력란 노출 여부 */
	isActionItemSectionEnabled: boolean;
}

/** 설정값이 없을 때 사용하는 기본 노출 상태 (둘 다 표시) */
const DEFAULT_MEMO_SECTION_VISIBILITY: IFMemoSectionVisibility = {
	isImpressionSectionEnabled: true,
	isActionItemSectionEnabled: true,
};

/**
 * 익스텐션 옵션에서 설정한 느낀 점·액션 아이템 입력란 노출 여부를 구독하는 훅.
 * @description chrome.storage.sync 를 읽고 onChanged 를 구독하므로, 옵션 페이지에서 설정을 바꾸면
 * 사이드 패널을 다시 열지 않아도 즉시 반영된다.
 */
export default function useMemoSectionVisibility(): IFMemoSectionVisibility {
	const [memoSectionVisibility, setMemoSectionVisibility] =
		useState<IFMemoSectionVisibility>(DEFAULT_MEMO_SECTION_VISIBILITY);

	useEffect(() => {
		let isSubscribed = true;

		const fetchMemoSectionVisibility = async () => {
			const [impressionEnabled, actionItemEnabled] = await Promise.all([
				ChromeSyncStorage.get<boolean | undefined>(
					STORAGE_KEYS.impressionSectionEnabled,
				),
				ChromeSyncStorage.get<boolean | undefined>(
					STORAGE_KEYS.actionItemSectionEnabled,
				),
			]);

			if (!isSubscribed) {
				return;
			}

			setMemoSectionVisibility({
				isImpressionSectionEnabled: impressionEnabled ?? true,
				isActionItemSectionEnabled: actionItemEnabled ?? true,
			});
		};

		fetchMemoSectionVisibility();

		const handleStorageChange = (
			changes: Record<string, chrome.storage.StorageChange>,
		) => {
			const impressionChange = changes[STORAGE_KEYS.impressionSectionEnabled];
			const actionItemChange = changes[STORAGE_KEYS.actionItemSectionEnabled];

			if (!impressionChange && !actionItemChange) {
				return;
			}

			setMemoSectionVisibility((previousVisibility) => ({
				isImpressionSectionEnabled: impressionChange
					? (impressionChange.newValue ?? true)
					: previousVisibility.isImpressionSectionEnabled,
				isActionItemSectionEnabled: actionItemChange
					? (actionItemChange.newValue ?? true)
					: previousVisibility.isActionItemSectionEnabled,
			}));
		};

		chrome.storage.sync.onChanged.addListener(handleStorageChange);

		return () => {
			isSubscribed = false;
			chrome.storage.sync.onChanged.removeListener(handleStorageChange);
		};
	}, []);

	return memoSectionVisibility;
}
