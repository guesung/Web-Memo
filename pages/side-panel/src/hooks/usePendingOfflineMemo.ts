import { useEffect, useState } from "react";
import {
	getPendingOfflineMemo,
	type IFOfflineMemoQueueItem,
	OFFLINE_MEMO_QUEUE_STORAGE_KEY,
} from "../utils/offlineMemoQueue";

/** 확인할 대상 메모. memoId가 있으면 memoId로, 없으면 url로 대기열 항목을 찾는다 */
interface UsePendingOfflineMemoProps {
	memoId?: number;
	url: string;
}

/**
 * 지금 편집 중인 메모(memoId 또는 url)의 대기열 항목을 반응형으로 돌려준다. 없으면 undefined.
 * @description 마운트·대상이 바뀔 때 한 번 읽고, 이후로는 chrome.storage.onChanged로 대기열
 * 변경을 들어 다시 읽는다. 저장 표시줄이 '지금 대기 중인가'를 그대로 반영하고, 오프라인에서
 * 페이지를 오갈 때 폼이 대기 중인 본문을 다시 채울 수 있게 하기 위해서다.
 * 사용처: useMemoForm.ts
 */
export default function usePendingOfflineMemo({
	memoId,
	url,
}: UsePendingOfflineMemoProps) {
	const [pendingItem, setPendingItem] = useState<
		IFOfflineMemoQueueItem | undefined
	>(undefined);

	useEffect(() => {
		let isCancelled = false;

		const refresh = async () => {
			const nextPendingItem = await getPendingOfflineMemo({ memoId, url });
			if (!isCancelled) {
				setPendingItem(nextPendingItem);
			}
		};

		void refresh();

		const handleStorageChange = (
			changes: Record<string, chrome.storage.StorageChange>,
			areaName: string,
		) => {
			if (
				areaName !== "local" ||
				!(OFFLINE_MEMO_QUEUE_STORAGE_KEY in changes)
			) {
				return;
			}

			void refresh();
		};

		chrome.storage.onChanged.addListener(handleStorageChange);
		return () => {
			isCancelled = true;
			chrome.storage.onChanged.removeListener(handleStorageChange);
		};
	}, [memoId, url]);

	return pendingItem;
}
