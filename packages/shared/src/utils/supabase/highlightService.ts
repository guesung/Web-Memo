import { SUPABASE } from "../../constants";
import type { HighlightTable, MemoSupabaseClient } from "../../types";
import { getPageKey } from "../Url";

/** 하이라이트 목록 페이지네이션 커서. (정렬값, id) 복합 커서로 중복·누락을 막는다. */
export interface HighlightPageCursor {
	value: string;
	id: number;
}

/** URL별 하이라이트 개수. `get_highlight_counts` RPC의 반환 행 */
export interface HighlightCountRow {
	url: string;
	count: number;
}

/** 페이지 식별값별 하이라이트 개수. */
export interface IFHighlightCountByPageKeyRow {
	page_key: string;
	count: number;
}

/** 하이라이트 저장과 조회를 담당한다. */
export class HighlightService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	private get table() {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from(SUPABASE.table.highlight);
	}

	/** 모바일 WebView 복원용. 페이지 하나의 하이라이트를 모두 가져온다. */
	getHighlightsByUrl = async (url: string) => {
		const pageKey = getPageKey(url);
		const highlights: HighlightTable["Row"][] = [];
		let lastId = 0;
		while (true) {
			const { data, error } = await this.table
				.select("*")
				.in("page_key", [pageKey, ""])
				.gt("id", lastId)
				.order("id", { ascending: true })
				.limit(500);
			if (error) {
				return { data: null, error };
			}
			highlights.push(
				...(data ?? []).filter((highlight) => {
					try {
						return (
							(highlight.page_key || getPageKey(highlight.url)) === pageKey
						);
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
		return { data: highlights, error: null };
	};

	/** 소유자의 하이라이트 한 건과 저장된 원본 URL을 확인한다. */
	getHighlightById = async ({ id, userId }: { id: number; userId: string }) =>
		this.table.select("*").eq("id", id).eq("user_id", userId).maybeSingle();

	/** 메모 목록의 페이지 키와 연결된 하이라이트를 일괄 조회한다. RLS로 소유권을 제한한다. */
	getHighlightsByUrls = async (urls: string[]) => {
		const uniqueUrls = Array.from(
			new Set(urls.filter(Boolean).map(getPageKey)),
		);
		if (uniqueUrls.length === 0) {
			return { data: [] as HighlightTable["Row"][], error: null };
		}

		const highlights: HighlightTable["Row"][] = [];
		for (const urlBatch of getPageKeyBatches(uniqueUrls)) {
			let lastId = 0;
			while (true) {
				const { data, error } = await this.table
					.select("*")
					.in("page_key", [...urlBatch, ""])
					.gt("id", lastId)
					.order("id", { ascending: true })
					.limit(500);
				if (error) {
					return { data: null, error };
				}
				highlights.push(
					...(data ?? []).filter((highlight) => {
						try {
							return urlBatch.includes(
								highlight.page_key || getPageKey(highlight.url),
							);
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

		return { data: highlights, error: null };
	};

	getHighlightsPaginated = async ({
		cursor,
		limit = 20,
		searchQuery,
		color,
	}: {
		cursor?: HighlightPageCursor;
		limit?: number;
		searchQuery?: string;
		color?: string;
	}) => {
		let query = this.table.select("*");

		if (color) {
			query = query.eq("color", color);
		}

		if (searchQuery) {
			query = query.or(
				`exact_text.ilike.%${searchQuery}%,note.ilike.%${searchQuery}%`,
			);
		}

		if (cursor) {
			query = query.or(
				`created_at.lt.${cursor.value},and(created_at.eq.${cursor.value},id.lt.${cursor.id})`,
			);
		}

		return query
			.order("created_at", { ascending: false })
			.order("id", { ascending: false })
			.limit(limit);
	};

	insertHighlight = async (request: HighlightTable["Insert"]) =>
		this.table
			.insert({ ...request, page_key: getPageKey(request.url) })
			.select();

	updateHighlight = async ({
		id,
		request,
		scope,
	}: {
		scope?: { url: string; userId: string };
		id: number;
		request: HighlightTable["Update"];
	}) => {
		let query = this.table
			.update({ ...request, updated_at: new Date().toISOString() })
			.eq("id", id);
		if (scope) {
			query = query.eq("url", scope.url).eq("user_id", scope.userId);
		}

		return query.select();
	};

	/** 삭제된 행을 반환해 RLS 또는 범위 불일치로 삭제되지 않은 요청을 구분한다. */
	deleteHighlight = async (
		id: number,
		scope?: { url: string; userId: string },
	) => {
		let query = this.table.delete().eq("id", id);
		if (scope) {
			query = query.eq("url", scope.url).eq("user_id", scope.userId);
		}

		return query.select();
	};

	/**
	 * URL별 하이라이트 개수를 조회한다.
	 * @description RLS가 적용되므로 호출자 본인의 하이라이트만 집계된다.
	 * 개수가 0인 URL은 결과에 포함되지 않으므로, 호출 측이 없으면 0으로 취급해야 한다.
	 */
	getHighlightCounts = async (urls: string[]) =>
		this.supabaseClient
			.schema(SUPABASE.schema.memo)
			// @ts-expect-error RPC function types not generated in schema
			.rpc("get_highlight_counts", { target_urls: urls });

	/** 키가 채워진 행과 기존 빈 키 행을 같은 조회에서 집계한다. */
	getHighlightCountsByPageKeys = async (pageKeys: string[]) => {
		if (pageKeys.length === 0) {
			return { data: [] as IFHighlightCountByPageKeyRow[], error: null };
		}
		const targetPageKeys = new Set(pageKeys);
		const counts = new Map<string, number>();
		for (const pageKeyBatch of getPageKeyBatches(Array.from(targetPageKeys))) {
			let lastId = 0;
			while (true) {
				const result = await this.table
					.select("id, url, page_key")
					.in("page_key", [...pageKeyBatch, ""])
					.gt("id", lastId)
					.order("id", { ascending: true })
					.limit(500);
				if (result.error) {
					return { data: null, error: result.error };
				}
				for (const highlight of result.data ?? []) {
					try {
						const pageKey = highlight.page_key || getPageKey(highlight.url);
						if (pageKeyBatch.includes(pageKey)) {
							counts.set(pageKey, (counts.get(pageKey) ?? 0) + 1);
						}
					} catch {
						// 백필할 수 없는 기존 URL은 다른 페이지의 집계를 막지 않는다.
					}
				}
				if (!result.data || result.data.length < 500) {
					break;
				}
				lastId = result.data[result.data.length - 1].id;
			}
		}
		return {
			data: Array.from(counts).map(([page_key, count]) => ({
				page_key,
				count,
			})),
			error: null,
		};
	};
}

const getPageKeyBatches = (pageKeys: string[]): string[][] => {
	const batches: string[][] = [];
	let batch: string[] = [];
	let encodedLength = 0;
	for (const pageKey of pageKeys) {
		const nextLength = encodeURIComponent(pageKey).length + 6;
		if (
			batch.length > 0 &&
			(batch.length >= 20 || encodedLength + nextLength > 6000)
		) {
			batches.push(batch);
			batch = [];
			encodedLength = 0;
		}
		batch.push(pageKey);
		encodedLength += nextLength;
	}
	if (batch.length > 0) {
		batches.push(batch);
	}

	return batches;
};
