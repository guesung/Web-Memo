import { SUPABASE } from "../../constants";
import type { MemoSupabaseClient } from "../../types";

/** 확장 공지 조회를 담당한다. 공지는 anon에게 SELECT만 열려 있어 세션 없이 읽는다. */
export class NoticeService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	/**
	 * 지금 노출 기간 안에 있는 공지 중 가장 최근 것 하나를 가져온다.
	 * @description 기간 필터는 DB가 걸러 주지 않으므로 쿼리에서 건다. 없으면 data가 null이다.
	 */
	getLatestActiveNotice = async () => {
		const now = new Date().toISOString();

		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from(SUPABASE.table.notice)
			.select("*")
			.or(`starts_at.is.null,starts_at.lte.${now}`)
			.or(`ends_at.is.null,ends_at.gt.${now}`)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();
	};
}
