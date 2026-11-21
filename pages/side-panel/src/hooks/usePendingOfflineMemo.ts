import { useCallback, useEffect, useRef, useState } from "react";
import {
	getPendingOfflineMemo,
	type IFOfflineMemoQueueItem,
	OFFLINE_MEMO_QUEUE_STORAGE_KEY,
} from "../utils/offlineMemoQueue";

interface UsePendingOfflineMemoProps {
	userId?: string;
	memoId?: number;
	url: string;
}

export type PendingOfflineMemoResult =
	| { status: "loading"; item?: never }
	| { status: "absent"; item?: never }
	| { status: "present"; item: IFOfflineMemoQueueItem }
	| { status: "error"; item?: never };

/** The result belongs only to the current account and editing target. */
export default function usePendingOfflineMemo({
	userId,
	memoId,
	url,
}: UsePendingOfflineMemoProps) {
	const scope = `${userId ?? ""}|${memoId ?? ""}|${url}`;
	const [resolved, setResolved] = useState<{
		scope: string;
		epoch: number;
		result: PendingOfflineMemoResult;
	} | null>(null);
	const generationRef = useRef(0);
	const scopeRef = useRef(scope);
	const scopeEpochRef = useRef(0);
	if (scopeRef.current !== scope) {
		scopeRef.current = scope;
		scopeEpochRef.current++;
		generationRef.current++;
	}
	const epoch = scopeEpochRef.current;

	const refresh = useCallback(async () => {
		const generation = ++generationRef.current;
		if (scopeRef.current === scope && scopeEpochRef.current === epoch) {
			setResolved({ scope, epoch, result: { status: "loading" } });
		}
		if (!userId) return;
		try {
			const item = await getPendingOfflineMemo({ userId, memoId, url });
			if (
				scopeRef.current === scope &&
				scopeEpochRef.current === epoch &&
				generationRef.current === generation
			) {
				setResolved({
					scope,
					epoch,
					result: item ? { status: "present", item } : { status: "absent" },
				});
			}
		} catch {
			if (
				scopeRef.current === scope &&
				scopeEpochRef.current === epoch &&
				generationRef.current === generation
			) {
				setResolved({ scope, epoch, result: { status: "error" } });
			}
		}
	}, [userId, memoId, url, scope, epoch]);

	useEffect(() => {
		void refresh();
		const handleStorageChange = (
			changes: Record<string, chrome.storage.StorageChange>,
			areaName: string,
		) => {
			if (areaName === "local" && OFFLINE_MEMO_QUEUE_STORAGE_KEY in changes) {
				void refresh();
			}
		};
		chrome.storage.onChanged.addListener(handleStorageChange);
		return () => {
			generationRef.current++;
			chrome.storage.onChanged.removeListener(handleStorageChange);
		};
	}, [refresh]);

	return {
		...(resolved?.scope === scope && resolved.epoch === epoch
			? resolved.result
			: { status: "loading" as const }),
		refresh,
	};
}
