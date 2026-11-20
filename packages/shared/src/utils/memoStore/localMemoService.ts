import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import type { GetMemoResponse, MemoRow, MemoTable } from "../../types";
import { getPageKey, getPathKey } from "../Url";
import type { IFMemoListResponse, IFMemoStore } from "./memoStore";

/** 기기 메모를 담는 chrome.storage.local 키. 오프라인 대기열("offlineMemoQueue")과 분리돼 있다. */
export const LOCAL_MEMO_STORAGE_KEY = "guestMemos";

/** chrome.storage.local 용량(unlimitedStorage 권한이 없을 때 10MB). */
export const LOCAL_STORAGE_QUOTA_BYTES = 10 * 1024 * 1024;

/** 이 비율 이상 차면 새 메모 저장을 막는다. */
export const LOCAL_STORAGE_BLOCK_RATIO = 0.95;

/** 이 비율 이상 차면 경고한다. */
export const LOCAL_STORAGE_WARN_RATIO = 0.8;

/** 휴지통(deleted_at)에 있는 기기 메모를 이 시간이 지나면 다음 저장 때 지운다. */
const DELETED_MEMO_RETENTION_MS = 24 * 60 * 60 * 1000;

const STORAGE_LOCK_NAME = "web-memo:guest-memo:storage";

/** 기기 저장 공간이 가득 차 새 메모를 저장하지 못할 때 던진다. */
export class LocalStorageFullError extends Error {
	constructor() {
		super("이 기기의 저장 공간이 가득 차 새 메모를 저장할 수 없습니다.");
		this.name = "LocalStorageFullError";
	}
}

/** storage에 담기는 모양. 로컬 id는 서버 id와 겹치지 않게 음수로 내려가며, 지워도 다시 쓰지 않는다. */
interface IFLocalMemoStorage {
	memos: MemoRow[];
	lastId: number;
}

const isStorageShape = (value: unknown): value is IFLocalMemoStorage =>
	typeof value === "object" &&
	value !== null &&
	Array.isArray((value as IFLocalMemoStorage).memos) &&
	typeof (value as IFLocalMemoStorage).lastId === "number";

const ok = <T>(data: T): PostgrestSingleResponse<T> => ({
	data,
	error: null,
	count: null,
	status: 200,
	statusText: "OK",
});

const sortByRecentUpdate = (memos: MemoRow[]) =>
	[...memos].sort((first, second) => {
		const dateDifference = (second.updated_at ?? "").localeCompare(
			first.updated_at ?? "",
		);
		return dateDifference || second.id - first.id;
	});

const withCategory = (memo: MemoRow): GetMemoResponse => ({
	...memo,
	category: null,
});

const toListResponse = (memos: MemoRow[]): IFMemoListResponse => ({
	data: sortByRecentUpdate(memos).map(withCategory),
	error: null,
});

/** 같은 페이지 키(또는 경로 키)인지 비교한다. 파싱할 수 없는 URL은 같지 않은 것으로 본다. */
const matchesKey = (
	memo: MemoRow,
	toKey: (url: string) => string,
	targetKey: string,
) => {
	try {
		return toKey(memo.page_key || memo.url) === targetKey;
	} catch {
		return false;
	}
};

/** 읽고 쓰는 동안 다른 탭·컨텍스트가 같은 키를 덮어쓰지 못하게 잠근다. Web Locks가 없으면 그대로 실행한다. */
export const withStorageLock = async <T>(
	task: () => Promise<T>,
): Promise<T> => {
	if (typeof navigator === "undefined" || !navigator.locks?.request) {
		return task();
	}
	return await navigator.locks.request(STORAGE_LOCK_NAME, task);
};

/** 기기 저장소(chrome.storage.local)가 찬 비율(0~1)을 읽는다. */
export const getLocalStorageUsageRatio = async () => {
	const bytesInUse = await chrome.storage.local.getBytesInUse(null);
	return bytesInUse / LOCAL_STORAGE_QUOTA_BYTES;
};

/**
 * 로그인하지 않은 사용자의 메모를 chrome.storage.local에 저장한다.
 * @description `MemoService`와 같은 모양의 응답을 돌려줘 훅이 저장소 종류를 신경 쓰지 않게 한다.
 * 삭제는 서버처럼 `deleted_at`만 찍어 되돌릴 수 있게 하고, 24시간 지난 휴지통 행은 다음 저장 때 지운다.
 * 저장 공간이 95% 이상이면 새 메모(insert)를 거부하고 기존 메모 수정은 허용한다.
 */
export class LocalMemoService implements IFMemoStore {
	readonly kind = "local" as const;

	private read = async (): Promise<IFLocalMemoStorage> => {
		const stored = await chrome.storage.local.get(LOCAL_MEMO_STORAGE_KEY);
		const value = stored[LOCAL_MEMO_STORAGE_KEY];
		return isStorageShape(value) ? value : { memos: [], lastId: 0 };
	};

	private write = (storage: IFLocalMemoStorage) =>
		chrome.storage.local.set({ [LOCAL_MEMO_STORAGE_KEY]: storage });

	/** 읽고-바꾸고-쓰기를 한 번에 잠가 실행한다. */
	private mutate = <T>(change: (storage: IFLocalMemoStorage) => T) =>
		withStorageLock(async () => {
			const storage = await this.read();
			const result = change(storage);
			await this.write(storage);
			return result;
		});

	private getAlive = async () =>
		(await this.read()).memos.filter((memo) => !memo.deleted_at);

	insertMemo = async (request: MemoTable["Insert"]) => {
		if ((await getLocalStorageUsageRatio()) >= LOCAL_STORAGE_BLOCK_RATIO) {
			throw new LocalStorageFullError();
		}

		const memo = await this.mutate<MemoRow>((storage) => {
			const now = new Date().toISOString();
			const expiredBefore = Date.now() - DELETED_MEMO_RETENTION_MS;
			storage.memos = storage.memos.filter(
				(memo) =>
					!memo.deleted_at || Date.parse(memo.deleted_at) > expiredBefore,
			);
			storage.lastId -= 1;
			const created: MemoRow = {
				actionItem: null,
				bookmark_count: null,
				category_id: null,
				comment_count: null,
				deleted_at: null,
				favIconUrl: null,
				impression: null,
				is_public: null,
				isReading: false,
				isStar: false,
				isWish: false,
				like_count: null,
				plannedDate: null,
				shared_at: null,
				user_id: "",
				...request,
				id: storage.lastId,
				page_key: getPageKey(request.url),
				created_at: request.created_at ?? now,
				updated_at: request.updated_at ?? now,
			};
			storage.memos.push(created);
			return created;
		});

		return ok([memo]);
	};

	/** 기기에 있는 메모 전체 개수. 휴지통(`deleted_at`)에 있는 메모는 세지 않는다. */
	countMemos = async () => (await this.getAlive()).length;

	getMemoByUrl = async (url: string): Promise<IFMemoListResponse> => {
		const pageKey = getPageKey(url);
		const memos = await this.getAlive();
		return toListResponse(
			memos.filter((memo) => matchesKey(memo, getPageKey, pageKey)),
		);
	};

	getMemosBySamePath = async (url: string): Promise<IFMemoListResponse> => {
		const pathKey = getPathKey(url);
		const memos = await this.getAlive();
		return toListResponse(
			memos.filter((memo) => matchesKey(memo, getPathKey, pathKey)),
		);
	};

	getMemoById = async (id: number): Promise<IFMemoListResponse> => {
		const memos = await this.getAlive();
		return toListResponse(memos.filter((memo) => memo.id === id));
	};

	updateMemo = async ({
		id,
		request,
	}: {
		id: MemoRow["id"];
		request: MemoTable["Update"];
	}) => {
		const result = await this.mutate<MemoRow[]>((storage) => {
			const updated: MemoRow[] = [];
			storage.memos = storage.memos.map((memo) => {
				if (memo.id !== id) return memo;
				const next: MemoRow = {
					...memo,
					...stripUndefined(request),
					id: memo.id,
					updated_at: request.updated_at ?? new Date().toISOString(),
				};
				if (request.url) next.page_key = getPageKey(request.url);
				updated.push(next);
				return next;
			});
			return updated;
		});

		return ok(result);
	};

	/** 서버처럼 지우지 않고 `deleted_at`만 찍어 되돌릴 수 있게 한다. */
	deleteMemos = async (idList: MemoRow["id"][]) =>
		this.setDeletedAt(idList, new Date().toISOString());

	restoreMemos = async (idList: MemoRow["id"][]) =>
		this.setDeletedAt(idList, null);

	private setDeletedAt = async (
		idList: MemoRow["id"][],
		deletedAt: string | null,
	) => {
		const result = await this.mutate<MemoRow[]>((storage) => {
			const changed: MemoRow[] = [];
			storage.memos = storage.memos.map((memo) => {
				if (!idList.includes(memo.id)) return memo;
				const next = { ...memo, deleted_at: deletedAt };
				changed.push(next);
				return next;
			});
			return changed;
		});

		return ok(result);
	};
}

/** `undefined` 값은 "바꾸지 않음"이므로 덮어쓰지 않게 뺀다. */
const stripUndefined = <T extends object>(value: T): Partial<T> =>
	Object.fromEntries(
		Object.entries(value).filter(([, entry]) => entry !== undefined),
	) as Partial<T>;
