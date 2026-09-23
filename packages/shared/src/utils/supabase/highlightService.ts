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
	getHighlightsByUrl = async (url: string) =>
		this.table.select("*").eq("url", url).order("id", { ascending: true });

	/** 메모 목록의 정확한 URL들과 연결된 하이라이트를 일괄 조회한다. RLS로 소유권을 제한한다. */
	getHighlightsByUrls = async (urls: string[]) => {
		const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
		if (uniqueUrls.length === 0) {
			return { data: [] as HighlightTable["Row"][], error: null };
		}

		const urlBatches: string[][] = [];
		let currentUrls: string[] = [];
		let encodedLength = 0;
		for (const url of uniqueUrls) {
			const urlLength = encodeURIComponent(url).length + 6;
			if (
				currentUrls.length > 0 &&
				(currentUrls.length >= 20 || encodedLength + urlLength > 6000)
			) {
				urlBatches.push(currentUrls);
				currentUrls = [];
				encodedLength = 0;
			}
			currentUrls.push(url);
			encodedLength += urlLength;
		}
		urlBatches.push(currentUrls);

		const highlights: HighlightTable["Row"][] = [];
		for (const urlBatch of urlBatches) {
			let offset = 0;
			while (true) {
				const { data, error } = await this.table
					.select("*")
					.in("url", urlBatch)
					.order("id", { ascending: true })
					.range(offset, offset + 499);
				if (error) {
					return { data: null, error };
				}
				highlights.push(...(data ?? []));
				if (!data || data.length < 500) {
					break;
				}
				offset += 500;
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
		this.table.insert(request).select();

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
			.rpc("get_highlight_counts", { target_urls: urls });
}
