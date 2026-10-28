import { analytics } from "@web-memo/shared/modules/analytics";
import type { MemoRow, MemoTable } from "@web-memo/shared/types";
import { isNetworkError } from "@web-memo/shared/utils";
import {
	assertValidOfflineMemo,
	changeOfflineMemoQueue,
	OFFLINE_MEMO_QUEUE_STORAGE_KEY,
	readOfflineMemoQueue,
	type StoredOfflineMemo,
} from "./offlineMemoQueueStorage";

export { OFFLINE_MEMO_QUEUE_STORAGE_KEY };

export interface IFOfflineMemoQueueTabInfo {
	title: string;
	favIconUrl?: string;
	url: string;
}

export interface IFOfflineMemoQueueData {
	title: string;
	memo: string;
	impression: string;
	actionItem: string;
	tabInfo: IFOfflineMemoQueueTabInfo;
}

export interface IFOfflineMemoQueueItem {
	userId: string;
	memoId?: number;
	url: string;
	baseUpdatedAt?: string | null;
	data: IFOfflineMemoQueueData;
	queuedAt: number;
	/** Persisted generation; new enqueue calls receive a fresh value. */
	revision?: string;
	/** An unsaved draft keeps its lookup identity after its first insert. */
	originUrl?: string;
	/** A conflict copy keeps accepting edits from the still-open original editor. */
	originMemoId?: number;
}

export interface IFOfflineMemoConflict {
	oldMemoId?: number;
	newMemoId: number;
	url: string;
}

export interface IFOfflineMemoFlushResult {
	conflicts: IFOfflineMemoConflict[];
	syncedCount: number;
	hasNetworkError: boolean;
	hasOtherError: boolean;
	attemptedCount: number;
	networkErrorCount: number;
	otherErrorCount: number;
	remainingCount?: number;
	ackLatencySumMs: number;
	ackLatencyCount: number;
	noOpCount: number;
	/** Conflict lineage whose latest revision was actually removed by ACK. */
	acknowledgedConflictCount: number;
}

type ServerMemoIdentity = Pick<MemoRow, "id" | "updated_at">;
export interface TOfflineMemoQueueService {
	getMemoById: (id: number) => Promise<{
		data:
			| Pick<
					MemoRow,
					"id" | "updated_at" | "title" | "memo" | "impression" | "actionItem"
			  >[]
			| null;
		error: unknown;
	}>;
	insertMemo: (
		request: MemoTable["Insert"],
	) => Promise<{ data: ServerMemoIdentity[] | null; error: unknown }>;
	updateMemo: (params: {
		id: MemoRow["id"];
		request: MemoTable["Update"];
	}) => Promise<{ data: ServerMemoIdentity[] | null; error: unknown }>;
}

type QueueTarget = Pick<IFOfflineMemoQueueItem, "userId" | "memoId" | "url">;
const sameTarget = (item: IFOfflineMemoQueueItem, target: QueueTarget) =>
	item.userId === target.userId &&
	(target.memoId !== undefined
		? item.memoId === target.memoId || item.originMemoId === target.memoId
		: (item.memoId === undefined && item.url === target.url) ||
			item.originUrl === target.url);

const findTargetIndex = (items: StoredOfflineMemo[], target: QueueTarget) =>
	items.findIndex((item) => sameTarget(item, target));

export const getPendingOfflineMemos = readOfflineMemoQueue;

export const getPendingOfflineMemo = async (target: QueueTarget) =>
	(await readOfflineMemoQueue()).find((item) => sameTarget(item, target));

export const hasPendingOfflineMemo = async (target: QueueTarget) =>
	(await getPendingOfflineMemo(target)) !== undefined;

export const enqueueOfflineMemo = async (item: IFOfflineMemoQueueItem) =>
	changeOfflineMemoQueue((items) => {
		assertValidOfflineMemo(item);
		const index = findTargetIndex(items, item);
		const existing = index < 0 ? undefined : items[index];
		const continuesConflict =
			item.memoId !== undefined && existing?.originMemoId === item.memoId;
		const next: StoredOfflineMemo = {
			...item,
			memoId: continuesConflict
				? existing.memoId
				: (item.memoId ?? existing?.memoId),
			baseUpdatedAt: existing ? existing.baseUpdatedAt : item.baseUpdatedAt,
			originUrl: existing?.originUrl,
			originMemoId: existing?.originMemoId,
			revision: crypto.randomUUID(),
		};
		return {
			items: [...items.filter((_, position) => position !== index), next],
			result: next,
			changed: true,
		};
	});

/** Conditional ACK only. The caller must provide the persisted revision. */
export const removeOfflineMemo = async (
	target: QueueTarget & { revision: string },
) =>
	changeOfflineMemoQueue((items) => {
		const index = findTargetIndex(items, target);
		if (index < 0 || items[index].revision !== target.revision) {
			return { items, result: false, changed: false };
		}
		return {
			items: items.filter((_, position) => position !== index),
			result: true,
			changed: true,
		};
	});

const buildMemoRequest = (data: IFOfflineMemoQueueData) => ({
	...data.tabInfo,
	title: data.title.trim() || data.tabInfo.title,
	memo: data.memo,
	impression: data.impression,
	actionItem: data.actionItem,
});

type FlushOutcome =
	| { type: "success"; serverMemo: ServerMemoIdentity }
	| { type: "conflict"; serverMemo: ServerMemoIdentity }
	| { type: "noOp"; serverMemo: ServerMemoIdentity }
	| { type: "networkError" }
	| { type: "otherError" }
	| { type: "cancelled" };

const validServerMemo = (value: unknown): value is ServerMemoIdentity => {
	if (typeof value !== "object" || value === null) return false;
	const memo = value as ServerMemoIdentity;
	return (
		typeof memo.id === "number" &&
		typeof memo.updated_at === "string" &&
		memo.updated_at.length > 0
	);
};

const matchesQueuedContent = (
	existing: Pick<MemoRow, "title" | "memo" | "impression" | "actionItem">,
	request: ReturnType<typeof buildMemoRequest>,
) =>
	existing.title === request.title &&
	existing.memo === request.memo &&
	existing.impression === request.impression &&
	existing.actionItem === request.actionItem;

const flushItem = async (
	item: StoredOfflineMemo,
	service: TOfflineMemoQueueService,
	shouldContinue: () => boolean,
	onAttempt: () => void,
): Promise<FlushOutcome> => {
	try {
		const request = buildMemoRequest(item.data);
		if (item.memoId === undefined) {
			if (!shouldContinue()) return { type: "cancelled" };
			onAttempt();
			const result = await service.insertMemo({ ...request, url: item.url });
			if (result.error) throw result.error;
			const serverMemo = result.data?.[0];
			if (!validServerMemo(serverMemo))
				throw new Error("Missing inserted memo identity");
			void analytics.trackMemoCreate(request);
			return { type: "success", serverMemo };
		}

		if (!shouldContinue()) return { type: "cancelled" };
		onAttempt();
		const existingResult = await service.getMemoById(item.memoId);
		if (existingResult.error) throw existingResult.error;
		const existing = existingResult.data?.[0];
		if (existing?.updated_at === item.baseUpdatedAt) {
			if (!shouldContinue()) return { type: "cancelled" };
			const result = await service.updateMemo({ id: item.memoId, request });
			if (result.error) throw result.error;
			const serverMemo = result.data?.[0];
			if (!validServerMemo(serverMemo))
				throw new Error("Missing updated memo identity");
			return { type: "success", serverMemo };
		}
		if (existing && matchesQueuedContent(existing, request)) {
			if (!validServerMemo(existing))
				throw new Error("Missing current memo identity");
			return { type: "noOp", serverMemo: existing };
		}
		if (!shouldContinue()) return { type: "cancelled" };
		const result = await service.insertMemo({ ...request, url: item.url });
		if (result.error) throw result.error;
		const serverMemo = result.data?.[0];
		if (!validServerMemo(serverMemo))
			throw new Error("Missing conflict memo identity");
		void analytics.trackMemoCreate(request);
		return { type: "conflict", serverMemo };
	} catch (error) {
		return { type: isNetworkError(error) ? "networkError" : "otherError" };
	}
};

/** ACK and rebase the next generation in one storage transaction. */
const acknowledge = (
	sent: StoredOfflineMemo,
	serverMemo: ServerMemoIdentity,
	wasConflict: boolean,
) =>
	changeOfflineMemoQueue((items) => {
		const index = findTargetIndex(items, sent);
		if (index < 0) return { items, result: "none" as const, changed: false };
		const current = items[index];
		if (current.revision === sent.revision) {
			return {
				items: items.filter((_, position) => position !== index),
				result: "removed" as const,
				changed: true,
			};
		}
		const followsSent =
			current.userId === sent.userId &&
			current.url === sent.url &&
			current.memoId === sent.memoId &&
			current.baseUpdatedAt === sent.baseUpdatedAt;
		if (!followsSent) return { items, result: "none" as const, changed: false };
		const next = [...items];
		next[index] = {
			...current,
			memoId: serverMemo.id,
			baseUpdatedAt: serverMemo.updated_at,
			originUrl: sent.memoId === undefined ? sent.url : current.originUrl,
			originMemoId: wasConflict
				? (sent.originMemoId ?? sent.memoId)
				: current.originMemoId,
		};
		return { items: next, result: "rebased" as const, changed: true };
	});

const withFlushLock = async <T>(
	userId: string,
	callback: () => Promise<T>,
): Promise<T> => {
	if (!navigator.locks?.request) throw new Error("Web Locks unavailable");
	return navigator.locks.request(
		`web-memo:offline-memo-queue:flush:${userId}`,
		{ mode: "exclusive" },
		callback,
	);
};

export const flushOfflineMemoQueue = async ({
	userId,
	memoService,
	shouldContinue = () => true,
}: {
	userId: string;
	memoService: TOfflineMemoQueueService;
	shouldContinue?: () => boolean;
}): Promise<IFOfflineMemoFlushResult> => {
	const result: IFOfflineMemoFlushResult = {
		conflicts: [],
		syncedCount: 0,
		hasNetworkError: false,
		hasOtherError: false,
		attemptedCount: 0,
		networkErrorCount: 0,
		otherErrorCount: 0,
		ackLatencySumMs: 0,
		ackLatencyCount: 0,
		noOpCount: 0,
		acknowledgedConflictCount: 0,
	};
	try {
		return await withFlushLock(userId, async () => {
			const attempted = new Set<string>();
			while (shouldContinue()) {
				let items: StoredOfflineMemo[];
				try {
					items = await readOfflineMemoQueue();
				} catch {
					result.hasOtherError = true;
					break;
				}
				const item = items.find(
					(candidate) =>
						candidate.userId === userId && !attempted.has(candidate.revision),
				);
				if (!item) break;
				attempted.add(item.revision);
				let wasAttempted = false;
				const outcome = await flushItem(
					item,
					memoService,
					shouldContinue,
					() => {
						if (wasAttempted) return;
						wasAttempted = true;
						result.attemptedCount += 1;
					},
				);
				if (outcome.type === "cancelled") break;
				if (outcome.type === "networkError") {
					result.hasNetworkError = true;
					result.networkErrorCount += 1;
					break;
				}
				if (outcome.type === "otherError") {
					result.hasOtherError = true;
					result.otherErrorCount += 1;
					continue;
				}
				if (!shouldContinue()) break;
				try {
					const acknowledged = await acknowledge(
						item,
						outcome.serverMemo,
						outcome.type === "conflict",
					);
					if (outcome.type === "conflict" && acknowledged !== "none") {
						result.conflicts.push({
							oldMemoId: item.originMemoId ?? item.memoId,
							newMemoId: outcome.serverMemo.id,
							url: item.url,
						});
					}
					if (acknowledged === "removed") {
						result.syncedCount += 1;
						if (
							outcome.type === "conflict" ||
							item.originMemoId !== undefined
						) {
							result.acknowledgedConflictCount += 1;
						}
						result.ackLatencyCount += 1;
						result.ackLatencySumMs += Math.max(0, Date.now() - item.queuedAt);
						if (outcome.type === "noOp") result.noOpCount += 1;
					}
				} catch {
					result.hasOtherError = true;
					result.otherErrorCount += 1;
					break;
				}
			}
			try {
				result.remainingCount = (await readOfflineMemoQueue()).filter(
					(item) => item.userId === userId,
				).length;
			} catch {
				result.hasOtherError = true;
			}
			return result;
		});
	} catch {
		result.hasOtherError = true;
		return result;
	}
};
