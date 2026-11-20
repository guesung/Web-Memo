import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import type { HighlightRow, HighlightTable } from "../../types";
import {
	getLocalStorageUsageRatio,
	LOCAL_STORAGE_BLOCK_RATIO,
	LocalStorageFullError,
	withStorageLock,
} from "../memoStore/localMemoService";
import { getPageKey } from "../Url";
import type {
	IFHighlightListResponse,
	IFHighlightResponse,
	IFHighlightScope,
	IFHighlightStore,
} from "./highlightStore";

/** 기기 하이라이트를 담는 chrome.storage.local 키. 기기 메모("guestMemos")와 분리돼 있다. */
export const LOCAL_HIGHLIGHT_STORAGE_KEY = "guestHighlights";

/** storage에 담기는 모양. 로컬 id는 서버 id와 겹치지 않게 음수로 내려가며, 지워도 다시 쓰지 않는다. */
interface IFLocalHighlightStorage {
	highlights: HighlightRow[];
	lastId: number;
}

const isStorageShape = (value: unknown): value is IFLocalHighlightStorage =>
	typeof value === "object" &&
	value !== null &&
	Array.isArray((value as IFLocalHighlightStorage).highlights) &&
	typeof (value as IFLocalHighlightStorage).lastId === "number";

const ok = <T>(data: T): PostgrestSingleResponse<T> => ({
	data,
	error: null,
	count: null,
	status: 200,
	statusText: "OK",
});

/** 같은 페이지 키인지 비교한다. 파싱할 수 없는 URL은 같지 않은 것으로 본다. */
const matchesPageKey = (highlight: HighlightRow, pageKey: string) => {
	try {
		return (highlight.page_key || getPageKey(highlight.url)) === pageKey;
	} catch {
		return false;
	}
};

const matchesScope = (highlight: HighlightRow, scope?: IFHighlightScope) =>
	!scope || (highlight.url === scope.url && highlight.user_id === scope.userId);

/** `undefined` 값은 "바꾸지 않음"이므로 덮어쓰지 않게 뺀다. */
const stripUndefined = <T extends object>(value: T): Partial<T> =>
	Object.fromEntries(
		Object.entries(value).filter(([, entry]) => entry !== undefined),
	) as Partial<T>;

/**
 * 로그인하지 않은 사용자의 하이라이트를 chrome.storage.local에 저장한다.
 * @description `HighlightService`와 같은 모양의 응답을 돌려줘 호출부가 저장소 종류를 신경 쓰지 않게 한다.
 * 메모와 같은 잠금을 쓰고, 저장 공간이 95% 이상이면 새 하이라이트(insert)를 거부하며 수정·삭제는 허용한다.
 * 서버 트리거(`ensure_memo_for_highlight`)와 달리 같은 페이지의 빈 기기 메모는 만들지 않는다.
 * 사이드 패널은 페이지 키로 메모와 하이라이트를 따로 읽기 때문이다.
 */
export class LocalHighlightService implements IFHighlightStore {
	readonly kind = "local" as const;

	private read = async (): Promise<IFLocalHighlightStorage> => {
		const stored = await chrome.storage.local.get(LOCAL_HIGHLIGHT_STORAGE_KEY);
		const value = stored[LOCAL_HIGHLIGHT_STORAGE_KEY];
		return isStorageShape(value) ? value : { highlights: [], lastId: 0 };
	};

	private write = (storage: IFLocalHighlightStorage) =>
		chrome.storage.local.set({ [LOCAL_HIGHLIGHT_STORAGE_KEY]: storage });

	/** 읽고-바꾸고-쓰기를 한 번에 잠가 실행한다. */
	private mutate = <T>(change: (storage: IFLocalHighlightStorage) => T) =>
		withStorageLock(async () => {
			const storage = await this.read();
			const result = change(storage);
			await this.write(storage);
			return result;
		});

	/** 기기에 있는 하이라이트 전체. 로그인 때 계정으로 옮길 대상이다. */
	getAllHighlights = async () => (await this.read()).highlights;

	getHighlightsByUrl = async (
		url: string,
	): Promise<IFHighlightListResponse> => {
		const pageKey = getPageKey(url);
		const { highlights } = await this.read();
		return {
			data: highlights
				.filter((highlight) => matchesPageKey(highlight, pageKey))
				.sort((first, second) => second.id - first.id),
			error: null,
		};
	};

	getHighlightById = async ({
		id,
		userId,
	}: {
		id: number;
		userId: string;
	}): Promise<IFHighlightResponse> => {
		const { highlights } = await this.read();
		return {
			data:
				highlights.find(
					(highlight) => highlight.id === id && highlight.user_id === userId,
				) ?? null,
			error: null,
		};
	};

	insertHighlight = async (request: HighlightTable["Insert"]) => {
		if ((await getLocalStorageUsageRatio()) >= LOCAL_STORAGE_BLOCK_RATIO) {
			throw new LocalStorageFullError();
		}

		const highlight = await this.mutate<HighlightRow>((storage) => {
			const now = new Date().toISOString();
			storage.lastId -= 1;
			const created: HighlightRow = {
				color: "yellow",
				favIconUrl: null,
				note: null,
				prefix_text: null,
				suffix_text: null,
				text_position_start: null,
				title: null,
				...request,
				id: storage.lastId,
				page_key: getPageKey(request.url),
				created_at: request.created_at ?? now,
				updated_at: request.updated_at ?? now,
			};
			storage.highlights.push(created);
			return created;
		});

		return ok([highlight]);
	};

	updateHighlight = async ({
		id,
		request,
		scope,
	}: {
		id: number;
		request: HighlightTable["Update"];
		scope?: IFHighlightScope;
	}) => {
		const result = await this.mutate<HighlightRow[]>((storage) => {
			const updated: HighlightRow[] = [];
			storage.highlights = storage.highlights.map((highlight) => {
				if (highlight.id !== id || !matchesScope(highlight, scope)) {
					return highlight;
				}
				const next: HighlightRow = {
					...highlight,
					...stripUndefined(request),
					id: highlight.id,
					updated_at: new Date().toISOString(),
				};
				if (request.url) next.page_key = getPageKey(request.url);
				updated.push(next);
				return next;
			});
			return updated;
		});

		return ok(result);
	};

	/** 삭제된 행을 반환해 범위 불일치로 삭제되지 않은 요청을 구분한다. */
	deleteHighlight = async (id: number, scope?: IFHighlightScope) => {
		const result = await this.mutate<HighlightRow[]>((storage) => {
			const deleted = storage.highlights.filter(
				(highlight) => highlight.id === id && matchesScope(highlight, scope),
			);
			storage.highlights = storage.highlights.filter(
				(highlight) => !deleted.includes(highlight),
			);
			return deleted;
		});

		return ok(result);
	};
}
