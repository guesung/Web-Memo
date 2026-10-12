import type {
	CreateHighlightMemoResult,
	HighlightMemoLink,
} from "../../types/highlightMemo";
import type { MemoSupabaseClient } from "../../types/supabaseCustom";

/** 직접 연결된 메모와 저장 시점의 인용문만 다룬다. URL 기반 관련 기록과 구분한다. */
export class HighlightMemoService {
	constructor(private readonly client: MemoSupabaseClient) {}

	async create(
		highlightId: number,
		memo: string,
	): Promise<CreateHighlightMemoResult> {
		const { data, error } = await this.client
			.schema("memo")
			.rpc("create_memo_from_highlight", {
				p_highlight_id: highlightId,
				p_memo: memo,
			});
		if (error) throw error;
		if (
			!data ||
			typeof data !== "object" ||
			Array.isArray(data) ||
			typeof data.memo_id !== "number" ||
			typeof data.highlight_id !== "number" ||
			typeof data.created !== "boolean" ||
			!(data.deleted_at === null || typeof data.deleted_at === "string")
		)
			throw new Error("Invalid highlight memo response");
		return {
			memo_id: data.memo_id,
			highlight_id: data.highlight_id,
			created: data.created,
			deleted_at: data.deleted_at,
		};
	}

	getByHighlightIds(ids: number[]) {
		return this.getLinks("highlight_id", ids);
	}

	getByMemoIds(ids: number[]) {
		return this.getLinks("memo_id", ids);
	}

	private async getLinks(
		column: "highlight_id" | "memo_id",
		ids: number[],
	): Promise<HighlightMemoLink[]> {
		const uniqueIds = Array.from(new Set(ids));
		const links: HighlightMemoLink[] = [];
		for (let start = 0; start < uniqueIds.length; start += 100) {
			const { data, error } = await this.client
				.schema("memo")
				.from("highlight_memo_source")
				.select("*, memo:memo_id(id,memo,deleted_at)")
				.in(column, uniqueIds.slice(start, start + 100));
			if (error) throw error;
			links.push(...(data ?? []));
		}
		return links;
	}
}
