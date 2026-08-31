import AsyncStorage from "@react-native-async-storage/async-storage";

const MEMOS_KEY = "webmemo:memos";

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
	/** 휴지통으로 보낸 시각. 값이 있으면 일반 조회에서 빠진다 */
	deletedAt?: string;
}

async function getAll(): Promise<LocalMemo[]> {
	const raw = await AsyncStorage.getItem(MEMOS_KEY);
	if (!raw) return [];
	return JSON.parse(raw) as LocalMemo[];
}

async function save(memos: LocalMemo[]) {
	await AsyncStorage.setItem(MEMOS_KEY, JSON.stringify(memos));
}

/**
 * 휴지통에 있지 않은 메모만 추린다.
 * @description 저장소를 읽는 경로가 여럿이라 각자 filter를 부르게 두면 하나가
 * 빠졌을 때 지운 메모가 그 화면에만 계속 보인다. 한 곳으로 모은다.
 */
async function getAlive(): Promise<LocalMemo[]> {
	const memos = await getAll();
	return memos.filter((memo) => !memo.deletedAt);
}

export async function getAllMemos(): Promise<LocalMemo[]> {
	const memos = await getAlive();
	return memos.sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);
}

export async function getMemoByUrl(url: string): Promise<LocalMemo | null> {
	const memos = await getAlive();
	return memos.find((m) => m.url === url) ?? null;
}

export async function upsertMemo(params: {
	url: string;
	title: string;
	memo: string;
	impression?: string;
	actionItem?: string;
	favIconUrl?: string;
	isWish?: boolean;
	isStar?: boolean;
	isReading?: boolean;
}): Promise<LocalMemo> {
	const memos = await getAll();
	const now = new Date().toISOString();
	// 휴지통에 있는 같은 URL의 메모는 없는 것으로 친다. 그걸 덮어쓰면 사용자가
	// 새로 쓴 메모가 휴지통 안에서 보이지 않게 된다. Supabase 경로도 조회가
	// deleted_at is null로 걸려 같은 결과가 된다.
	const existing = memos.find((m) => m.url === params.url && !m.deletedAt);

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
		await save(memos);
		return existing;
	}

	const newMemo: LocalMemo = {
		id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		url: params.url,
		title: params.title,
		memo: params.memo,
		impression: params.impression,
		actionItem: params.actionItem,
		favIconUrl: params.favIconUrl,
		isWish: params.isWish,
		isStar: params.isStar,
		isReading: params.isReading,
		createdAt: now,
		updatedAt: now,
		synced: false,
	};
	memos.push(newMemo);
	await save(memos);
	return newMemo;
}

export async function toggleWishByUrl(
	url: string,
	title?: string,
	favIconUrl?: string,
): Promise<LocalMemo> {
	const memos = await getAll();
	// 목록 전체를 다시 저장하므로 읽기는 getAll이어야 한다. 살아있는 것만 읽어
	// save하면 휴지통에 있던 메모가 통째로 사라진다.
	const existing = memos.find((m) => m.url === url && !m.deletedAt);
	const now = new Date().toISOString();

	if (existing) {
		existing.isWish = !existing.isWish;
		existing.updatedAt = now;
		existing.synced = false;
		await save(memos);
		return existing;
	}

	const newMemo: LocalMemo = {
		id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		url,
		title: title || "",
		memo: "",
		favIconUrl,
		isWish: true,
		createdAt: now,
		updatedAt: now,
		synced: false,
	};
	memos.push(newMemo);
	await save(memos);
	return newMemo;
}

export async function toggleStarByUrl(
	url: string,
	title?: string,
	favIconUrl?: string,
): Promise<LocalMemo> {
	const memos = await getAll();
	// 목록 전체를 다시 저장하므로 읽기는 getAll이어야 한다. 살아있는 것만 읽어
	// save하면 휴지통에 있던 메모가 통째로 사라진다.
	const existing = memos.find((m) => m.url === url && !m.deletedAt);
	const now = new Date().toISOString();

	if (existing) {
		existing.isStar = !existing.isStar;
		existing.updatedAt = now;
		existing.synced = false;
		await save(memos);
		return existing;
	}

	const newMemo: LocalMemo = {
		id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		url,
		title: title || "",
		memo: "",
		favIconUrl,
		isStar: true,
		createdAt: now,
		updatedAt: now,
		synced: false,
	};
	memos.push(newMemo);
	await save(memos);
	return newMemo;
}

export async function toggleReadingByUrl(
	url: string,
	title?: string,
	favIconUrl?: string,
): Promise<LocalMemo> {
	const memos = await getAll();
	// 목록 전체를 다시 저장하므로 읽기는 getAll이어야 한다. 살아있는 것만 읽어
	// save하면 휴지통에 있던 메모가 통째로 사라진다.
	const existing = memos.find((m) => m.url === url && !m.deletedAt);
	const now = new Date().toISOString();

	if (existing) {
		existing.isReading = !existing.isReading;
		existing.updatedAt = now;
		existing.synced = false;
		await save(memos);
		return existing;
	}

	const newMemo: LocalMemo = {
		id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		url,
		title: title || "",
		memo: "",
		favIconUrl,
		isReading: true,
		createdAt: now,
		updatedAt: now,
		synced: false,
	};
	memos.push(newMemo);
	await save(memos);
	return newMemo;
}

/**
 * 메모를 휴지통으로 보낸다.
 * @description 행을 지우지 않고 `deletedAt`만 찍는다. 로그인 사용자의 Supabase
 * 경로와 같은 규칙이라, 로그인 여부에 따라 삭제가 다르게 동작하지 않는다.
 */
export async function deleteMemo(id: string): Promise<void> {
	const memos = await getAll();
	const now = new Date().toISOString();
	await save(
		memos.map((m) =>
			m.id === id ? { ...m, deletedAt: now, synced: false } : m,
		),
	);
}

/** 휴지통에 있는 메모를 최근에 버린 순으로 가져온다 */
export async function getDeletedMemos(): Promise<LocalMemo[]> {
	const memos = await getAll();
	return memos
		.filter((m) => m.deletedAt)
		.sort(
			(a, b) =>
				new Date(b.deletedAt as string).getTime() -
				new Date(a.deletedAt as string).getTime(),
		);
}

/** 휴지통의 메모를 되살린다 */
export async function restoreMemo(id: string): Promise<void> {
	const memos = await getAll();
	await save(
		memos.map((m) => {
			if (m.id !== id) {
				return m;
			}

			const { deletedAt: _deletedAt, ...restored } = m;
			return { ...restored, synced: false };
		}),
	);
}

/** 메모를 완전히 지운다. 되돌릴 수 없다 */
export async function deleteMemoPermanently(id: string): Promise<void> {
	const memos = await getAll();
	await save(memos.filter((m) => m.id !== id));
}

export async function getUnsyncedMemos(): Promise<LocalMemo[]> {
	const memos = await getAlive();
	return memos.filter((m) => !m.synced);
}

export async function markAsSynced(ids: string[]): Promise<void> {
	const memos = await getAll();
	for (const memo of memos) {
		if (ids.includes(memo.id)) {
			memo.synced = true;
		}
	}
	await save(memos);
}

export async function clearSyncedMemos(): Promise<number> {
	const memos = await getAll();
	const unsyncedMemos = memos.filter((m) => !m.synced);
	const clearedCount = memos.length - unsyncedMemos.length;
	await save(unsyncedMemos);
	return clearedCount;
}
