import { SUPABASE } from "../../constants";
import type { HighlightTable, MemoSupabaseClient } from "../../types";

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
	getHighlightsByUrl = async (url: string) =>
		this.table.select("*").eq("url", url).order("id", { ascending: true });

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
		this.table.insert(request).select();

	updateHighlight = async ({
		id,
		request,
	}: {
		id: number;
		request: HighlightTable["Update"];
	}) =>
		this.table
			.update({ ...request, updated_at: new Date().toISOString() })
			.eq("id", id)
			.select();

	deleteHighlight = async (id: number) => this.table.delete().eq("id", id);

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
}
