import { SUPABASE } from "../../constants";
import type {
	GetMemoResponse,
	MemoRow,
	MemoSupabaseClient,
	MemoTable,
} from "../../types";
import { getMemoSearchFilter } from "../memoSearchFilter";
import { getPageKey, getPathKey } from "../Url";

/** 날짜 정렬에서 같은 시각의 메모까지 이어 읽는 복합 커서. */
export interface IFMemoPageCursor {
	value: string | null;
	id: MemoRow["id"];
}

/** 메모 조회와 저장 및 휴지통 작업을 처리한다. */
export class MemoService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	insertMemo = async (request: MemoTable["Insert"]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.insert({ ...request, page_key: getPageKey(request.url) })
			.select();

	/** 같은 페이지의 메모 후보를 최근 수정 순으로 모두 조회한다. */
	getMemoByUrl = async (url: string) => {
		const pageKey = getPageKey(url);
		const memos: GetMemoResponse[] = [];
		let lastId = 0;
		while (true) {
			const { data, error } = await this.supabaseClient
				.schema(SUPABASE.table.memo)
				.from(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.is("deleted_at", null)
				.in("page_key", [pageKey, ""])
				.gt("id", lastId)
				.order("id", { ascending: true })
				.limit(500);
			if (error) {
				return { data: null, error };
			}
			memos.push(
				...(data ?? []).filter((memo) => {
					try {
						return (memo.page_key || getPageKey(memo.url)) === pageKey;
					} catch {
						return false;
					}
				}),
			);
			if (!data || data.length < 500) {
				break;
			}
			lastId = data[data.length - 1].id;
		}
		memos.sort((first, second) => {
			const dateDifference = (second.updated_at ?? "").localeCompare(
				first.updated_at ?? "",
			);
			return dateDifference || second.id - first.id;
		});
		return { data: memos, error: null };
	};

	/**
	 * 쿼리만 다른 주소까지 포함해 같은 경로의 메모 후보를 최근 수정 순으로 모두 조회한다.
	 * @description `page_key`가 경로로 시작하는 행과 아직 키가 없는 옛 행을 읽고, JS에서 경로 키를 다시 비교해
	 * `/a`가 `/ab`를 잡거나 LIKE 와일드카드가 섞여 넓게 잡힌 행을 걸러 낸다.
	 */
	getMemosBySamePath = async (url: string) => {
		const pathKey = getPathKey(url);
		const pathPattern = `${pathKey.replace(/[\\%_]/g, "\\$&")}%`;
		const memos: GetMemoResponse[] = [];

		for (const pageKeyFilter of ["like", "empty"] as const) {
			let lastId = 0;
			while (true) {
				const baseQuery = this.supabaseClient
					.schema(SUPABASE.table.memo)
					.from(SUPABASE.table.memo)
					.select("*, category(id, name, color)")
					.is("deleted_at", null);
				const filteredQuery =
					pageKeyFilter === "like"
						? baseQuery.like("page_key", pathPattern)
						: baseQuery.eq("page_key", "");
				const { data, error } = await filteredQuery
					.gt("id", lastId)
					.order("id", { ascending: true })
					.limit(500);
				if (error) {
					return { data: null, error };
				}
				memos.push(
					...(data ?? []).filter((memo) => {
						try {
							return getPathKey(memo.page_key || memo.url) === pathKey;
						} catch {
							return false;
						}
					}),
				);
				if (!data || data.length < 500) {
					break;
				}
				lastId = data[data.length - 1].id;
			}
		}
		// 두 조회는 실제 DB에서 겹치지 않지만, 필터를 무시하는 목에서도 한 메모가 두 번 나오지 않게 한다.
		const uniqueMemos = Array.from(
			new Map(memos.map((memo) => [memo.id, memo])).values(),
		);
		uniqueMemos.sort((first, second) => {
			const dateDifference = (second.updated_at ?? "").localeCompare(
				first.updated_at ?? "",
			);
			return dateDifference || second.id - first.id;
		});
		return { data: uniqueMemos, error: null };
	};

	getMemoById = async (id: number) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.select("*, category(id, name, color)")
			.is("deleted_at", null)
			.eq("id", id);

	upsertMemos = async (request: GetMemoResponse[]) => {
		const requestMapped = request.map(({ category, ...rest }) => ({
			...rest,
			category_id: category?.id ?? rest.category_id,
		}));
		return this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.upsert(requestMapped)
			.select();
	};
	/**
	 * @deprecated Use getMemosPaginated for better performance.
	 * This method fetches up to 2000 records at once which is inefficient.
	 */
	getMemos = async () => {
		const [firstBatch, secondBatch] = await Promise.all([
			this.supabaseClient
				.schema(SUPABASE.table.memo)
				.from(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.is("deleted_at", null)
				.order("updated_at", { ascending: false })
				.range(0, 999),
			this.supabaseClient
				.schema(SUPABASE.table.memo)
				.from(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.is("deleted_at", null)
				.order("updated_at", { ascending: false })
				.range(1000, 1999),
			this.supabaseClient
				.schema(SUPABASE.table.memo)
				.from(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.is("deleted_at", null)
				.order("updated_at", { ascending: false })
				.range(2000, 2999),
			this.supabaseClient
				.schema(SUPABASE.table.memo)
				.from(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.is("deleted_at", null)
				.order("updated_at", { ascending: false })
				.range(3000, 3999),
		]);
		const data = [...(firstBatch?.data ?? []), ...(secondBatch?.data ?? [])];
		return { ...firstBatch, data };
	};

	/** 정렬 값과 id 순서로 메모 페이지를 조회한다. 문자열 커서는 기존 호출에서 사용한다. */
	getMemosPaginated = async ({
		cursor,
		limit = 20,
		category,
		isWish,
		isStar,
		isReading,
		searchQuery,
		sortBy = "updated_at",
	}: {
		cursor?: string | IFMemoPageCursor;
		limit?: number;
		category?: string;
		isWish?: boolean;
		isStar?: boolean;
		isReading?: boolean;
		searchQuery?: string;
		sortBy?: "updated_at" | "created_at" | "title";
	}) => {
		const selectQuery = category
			? "*, category!inner(id, name, color)"
			: "*, category(id, name, color)";

		const ascending = sortBy === "title";

		let query = this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.select(selectQuery, { count: "exact" })
			.is("deleted_at", null)
			.order(
				sortBy,
				ascending ? { ascending } : { ascending, nullsFirst: false },
			)
			.order("id", { ascending })
			.limit(limit);

		if (cursor) {
			if (typeof cursor === "string") {
				query = ascending ? query.gt(sortBy, cursor) : query.lt(sortBy, cursor);
			} else if (cursor.value === null) {
				query = query.is(sortBy, null).lt("id", cursor.id);
			} else {
				const operator = ascending ? "gt" : "lt";
				const value = JSON.stringify(cursor.value);
				const cursorFilter = `${sortBy}.${operator}.${value},and(${sortBy}.eq.${value},id.${operator}.${cursor.id})`;
				query = query.or(
					ascending ? cursorFilter : `${cursorFilter},${sortBy}.is.null`,
				);
			}
		}

		if (isWish !== undefined) {
			query = query.eq("isWish", isWish);
		}

		if (isStar !== undefined) {
			query = query.eq("isStar", isStar);
		}

		if (isReading !== undefined) {
			query = query.eq("isReading", isReading);
		}

		if (category) {
			query = query.eq("category.name", category);
		}

		if (searchQuery) {
			query = query.or(getMemoSearchFilter(searchQuery));
		}

		return query;
	};

	updateMemo = async ({
		id,
		request,
	}: {
		id: MemoRow["id"];
		request: MemoTable["Update"];
	}) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.update(request)
			.eq("id", id)
			.select();

	/**
	 * 메모를 휴지통으로 보낸다.
	 * @description 행을 지우지 않고 `deleted_at`만 찍는다. 하이라이트·카테고리
	 * 관계가 그대로 남아 복구가 UPDATE 한 번으로 끝난다. 영구 삭제는
	 * {@link deleteMemosPermanently}가 따로 맡는다.
	 */
	deleteMemo = async (id: MemoRow["id"]) => this.deleteMemos([id]);

	/** 메모 여러 개를 휴지통으로 보낸다 */
	deleteMemos = async (idList: MemoRow["id"][]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.update({ deleted_at: new Date().toISOString() })
			.in("id", idList)
			.select();

	/**
	 * 휴지통에 있는 메모를 최근에 버린 순으로 가져온다.
	 * @description 다른 조회는 전부 `deleted_at is null`로 거르므로, 삭제된 행을
	 * 읽는 경로는 여기 하나뿐이다.
	 */
	getDeletedMemos = async () =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.select("*, category(id, name, color)")
			.not("deleted_at", "is", null)
			.order("deleted_at", { ascending: false });

	/** 휴지통의 메모를 되살린다 */
	restoreMemos = async (idList: MemoRow["id"][]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.update({ deleted_at: null })
			.in("id", idList)
			.select();

	/**
	 * 메모를 완전히 지운다. 되돌릴 수 없다.
	 * @description 휴지통 안에서만 부른다. 실수로 살아있는 메모를 지우지 않도록
	 * `deleted_at`이 찍힌 행으로 대상을 한 번 더 좁힌다.
	 */
	deleteMemosPermanently = async (idList: MemoRow["id"][]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.delete()
			.not("deleted_at", "is", null)
			.in("id", idList)
			.select();
}
