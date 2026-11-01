import type { IFOfflineMemoQueueItem } from "./offlineMemoQueue";

export const OFFLINE_MEMO_QUEUE_STORAGE_KEY = "offlineMemoQueue";
const STORAGE_LOCK_NAME = "web-memo:offline-memo-queue:storage";

export type StoredOfflineMemo = IFOfflineMemoQueueItem & { revision: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isValidItem = (value: unknown): value is IFOfflineMemoQueueItem => {
	if (!isRecord(value) || !isRecord(value.data)) return false;
	const { data } = value;
	return (
		typeof value.userId === "string" &&
		value.userId.length > 0 &&
		typeof value.url === "string" &&
		value.url.length > 0 &&
		(value.memoId === undefined ||
			(typeof value.memoId === "number" && Number.isInteger(value.memoId))) &&
		(value.baseUpdatedAt === undefined ||
			value.baseUpdatedAt === null ||
			typeof value.baseUpdatedAt === "string") &&
		typeof value.queuedAt === "number" &&
		Number.isFinite(value.queuedAt) &&
		(value.revision === undefined ||
			(typeof value.revision === "string" && value.revision.length > 0)) &&
		(value.originUrl === undefined ||
			(typeof value.originUrl === "string" && value.originUrl.length > 0)) &&
		(value.originMemoId === undefined ||
			(typeof value.originMemoId === "number" &&
				Number.isInteger(value.originMemoId))) &&
		typeof data.title === "string" &&
		typeof data.memo === "string" &&
		typeof data.impression === "string" &&
		typeof data.actionItem === "string" &&
		isRecord(data.tabInfo) &&
		typeof data.tabInfo.title === "string" &&
		typeof data.tabInfo.url === "string" &&
		data.tabInfo.url.length > 0 &&
		(data.tabInfo.favIconUrl === undefined ||
			typeof data.tabInfo.favIconUrl === "string")
	);
};

export const assertValidOfflineMemo = (value: unknown): void => {
	if (!isValidItem(value)) throw new Error("Invalid offline memo queue item");
};

const readItems = async (): Promise<StoredOfflineMemo[]> => {
	const stored = await chrome.storage.local.get(OFFLINE_MEMO_QUEUE_STORAGE_KEY);
	const raw: unknown = stored[OFFLINE_MEMO_QUEUE_STORAGE_KEY];
	if (raw === undefined) return [];
	if (!Array.isArray(raw) || !raw.every(isValidItem)) {
		throw new Error("Invalid offline memo queue storage");
	}
	return raw as StoredOfflineMemo[];
};

const withStorageLock = async <T>(callback: () => Promise<T>): Promise<T> => {
	if (!navigator.locks?.request) throw new Error("Web Locks unavailable");
	return navigator.locks.request(
		STORAGE_LOCK_NAME,
		{ mode: "exclusive" },
		callback,
	);
};

export const readOfflineMemoQueue = async (): Promise<StoredOfflineMemo[]> =>
	withStorageLock(async () => {
		const items = await readItems();
		if (items.some((item) => item.revision === undefined)) {
			const migrated = items.map((item) => ({
				...item,
				revision: item.revision ?? crypto.randomUUID(),
			}));
			await chrome.storage.local.set({
				[OFFLINE_MEMO_QUEUE_STORAGE_KEY]: migrated,
			});
			return migrated;
		}
		return items;
	});

export const changeOfflineMemoQueue = async <T>(
	change: (items: StoredOfflineMemo[]) => {
		items: StoredOfflineMemo[];
		result: T;
		changed: boolean;
	},
): Promise<T> =>
	withStorageLock(async () => {
		const current = await readItems();
		const migrated = current.map((item) => ({
			...item,
			revision: item.revision ?? crypto.randomUUID(),
		}));
		const next = change(migrated);
		if (next.changed || current.some((item) => item.revision === undefined)) {
			await chrome.storage.local.set({
				[OFFLINE_MEMO_QUEUE_STORAGE_KEY]: next.items,
			});
		}
		return next.result;
	});
