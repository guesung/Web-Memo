import { getPageKey } from "@web-memo/shared/utils/url";
import { changeLocalMemos, readLocalMemos } from "./localMemoStore";

export async function getAllMemos(): Promise<LocalMemo[]> {
	return (await readLocalMemos())
		.filter((memo) => !memo.deletedAt)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getMemoByUrl(url: string): Promise<LocalMemo[]> {
	return pageCandidates(await readLocalMemos(), url);
}

export function upsertMemo(params: LocalMemoUpsert): Promise<LocalMemo> {
	return changeLocalMemos((memos) => {
		const existing = resolveCandidate(
			memos,
			params.url,
			params.selectedId,
			params.expectedNew,
		);
		const now = new Date().toISOString();
		if (existing) {
			existing.title = params.title;
			existing.memo = params.memo;
			if (params.impression !== undefined)
				existing.impression = params.impression;
			if (params.actionItem !== undefined)
				existing.actionItem = params.actionItem;
			if (params.favIconUrl) existing.favIconUrl = params.favIconUrl;
			if (params.isWish !== undefined) existing.isWish = params.isWish;
			if (params.isStar !== undefined) existing.isStar = params.isStar;
			if (params.isReading !== undefined) existing.isReading = params.isReading;
			existing.updatedAt = now;
			existing.synced = false;
			return { memos, result: existing };
		}
		const created = createMemo(
			{
				url: params.url,
				title: params.title,
				memo: params.memo,
				impression: params.impression,
				actionItem: params.actionItem,
				favIconUrl: params.favIconUrl,
				isWish: params.isWish,
				isStar: params.isStar,
				isReading: params.isReading,
			},
			now,
		);
		return { memos: [...memos, created], result: created };
	});
}

export function toggleWishByUrl(
	url: string,
	title?: string,
	favIconUrl?: string,
	selectedId?: string,
) {
	return toggleFlag("isWish", { url, title, favIconUrl, selectedId });
}
export function toggleStarByUrl(
	url: string,
	title?: string,
	favIconUrl?: string,
	selectedId?: string,
) {
	return toggleFlag("isStar", { url, title, favIconUrl, selectedId });
}
export function toggleReadingByUrl(
	url: string,
	title?: string,
	favIconUrl?: string,
	selectedId?: string,
) {
	return toggleFlag("isReading", { url, title, favIconUrl, selectedId });
}

/** 휴지통 메모까지 보존하는 전체 배열 transaction. */
export function deleteMemo(id: string): Promise<void> {
	return changeLocalMemos((memos) => ({
		memos: memos.map((memo) =>
			memo.id === id
				? { ...memo, deletedAt: new Date().toISOString(), synced: false }
				: memo,
		),
		result: undefined,
	}));
}
export async function getDeletedMemos(): Promise<LocalMemo[]> {
	return (await readLocalMemos())
		.filter((memo) => memo.deletedAt)
		.sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}
export function restoreMemo(id: string): Promise<void> {
	return changeLocalMemos((memos) => ({
		memos: memos.map((memo) => {
			if (memo.id !== id) return memo;
			const { deletedAt: _deletedAt, ...restored } = memo;
			return { ...restored, synced: false };
		}),
		result: undefined,
	}));
}
export function deleteMemoPermanently(id: string): Promise<void> {
	return changeLocalMemos((memos) => ({
		memos: memos.filter((memo) => memo.id !== id),
		result: undefined,
	}));
}
export async function getUnsyncedMemos(): Promise<LocalMemo[]> {
	return (await readLocalMemos()).filter(
		(memo) => !memo.deletedAt && !memo.synced,
	);
}
export function markAsSynced(ids: string[]): Promise<void> {
	return changeLocalMemos((memos) => ({
		memos: memos.map((memo) =>
			ids.includes(memo.id) ? { ...memo, synced: true } : memo,
		),
		result: undefined,
	}));
}
export function clearSyncedMemos(): Promise<number> {
	return changeLocalMemos((memos) => {
		const remaining = memos.filter((memo) => !memo.synced);
		return { memos: remaining, result: memos.length - remaining.length };
	});
}

function pageCandidates(memos: LocalMemo[], url: string) {
	const pageKey = getPageKey(url);
	return memos
		.filter((memo) => !memo.deletedAt && getPageKey(memo.url) === pageKey)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
function resolveCandidate(
	memos: LocalMemo[],
	url: string,
	selectedId?: string,
	expectedNew?: boolean,
) {
	const candidates = pageCandidates(memos, url);
	if (expectedNew && candidates.length)
		throw new Error("메모가 새로 생겼어요. 저장할 메모를 선택해 주세요.");
	if (!selectedId && candidates.length > 1)
		throw new Error("수정할 메모를 선택해 주세요.");
	const selected = selectedId
		? candidates.find((memo) => memo.id === selectedId)
		: candidates[0];
	if (selectedId && !selected)
		throw new Error("선택한 메모가 현재 페이지에 속하지 않습니다.");
	return selected;
}
function toggleFlag(
	flag: "isWish" | "isStar" | "isReading",
	params: {
		url: string;
		title?: string;
		favIconUrl?: string;
		selectedId?: string;
	},
): Promise<LocalMemo> {
	return changeLocalMemos((memos) => {
		const existing = resolveCandidate(memos, params.url, params.selectedId);
		const now = new Date().toISOString();
		if (existing) {
			existing[flag] = !existing[flag];
			existing.updatedAt = now;
			existing.synced = false;
			return { memos, result: existing };
		}
		const created = createMemo(
			{
				url: params.url,
				title: params.title || "",
				memo: "",
				favIconUrl: params.favIconUrl,
				[flag]: true,
			},
			now,
		);
		return { memos: [...memos, created], result: created };
	});
}
function createMemo(
	params: Omit<LocalMemo, "id" | "createdAt" | "updatedAt" | "synced">,
	now: string,
): LocalMemo {
	return {
		...params,
		id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		createdAt: now,
		updatedAt: now,
		synced: false,
	};
}

export interface LocalMemo {
	id: string;
	url: string;
	title: string;
	memo: string;
	impression?: string;
	actionItem?: string;
	favIconUrl?: string;
	createdAt: string;
	updatedAt: string;
	synced: boolean;
	isWish?: boolean;
	isStar?: boolean;
	isReading?: boolean;
	deletedAt?: string;
}
interface LocalMemoUpsert {
	selectedId?: string;
	expectedNew?: boolean;
	url: string;
	title: string;
	memo: string;
	impression?: string;
	actionItem?: string;
	favIconUrl?: string;
	isWish?: boolean;
	isStar?: boolean;
	isReading?: boolean;
}
