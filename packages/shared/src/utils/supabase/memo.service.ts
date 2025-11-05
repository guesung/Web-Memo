import { SUPABASE } from "../../constants";
import type {
	GetMemoResponse,
	MemoRow,
	MemoSupabaseClient,
	MemoTable,
} from "../../types";
import { BaseSupabaseService } from "./base.service";

/**
 * MemoService - 메모 관련 Supabase 작업을 처리하는 서비스
 */
export class MemoService extends BaseSupabaseService {
	constructor(supabaseClient: MemoSupabaseClient) {
		super(supabaseClient);
	}

	insertMemo = async (request: MemoTable["Insert"]) =>
		this.getTable(SUPABASE.table.memo)
			.insert(request)
			.select();

	/**
	 * 메모 목록을 upsert
	 *
	 * Note: category는 relation이므로 제거 후 upsert
	 * 카테고리는 별도로 category_id 필드를 통해 관리됨
	 */
	upsertMemos = async (request: GetMemoResponse[]) => {
		const requestWithoutCategory = request.map(({ category, ...rest }) => rest);
		return this.getTable(SUPABASE.table.memo)
			.upsert(requestWithoutCategory)
			.select();
	};

	/**
	 * 모든 메모를 가져옴
	 *
	 * Note: Supabase의 1000개 제한을 우회하기 위해 2개 배치로 나누어 조회
	 * TODO: 페이지네이션 또는 무한 스크롤로 개선 고려
	 */
	getMemos = async () => {
		const [firstBatch, secondBatch] = await Promise.all([
			this.getTable(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.order("updated_at", { ascending: false })
				.range(0, 999),
			this.getTable(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.order("updated_at", { ascending: false })
				.range(1000, 1999),
		]);
		const data = [...(firstBatch?.data ?? []), ...(secondBatch?.data ?? [])];
		return { ...firstBatch, data };
	};

	updateMemo = async ({
		id,
		request,
	}: {
		id: MemoRow["id"];
		request: MemoTable["Update"];
	}) =>
		this.getTable(SUPABASE.table.memo)
			.update(request)
			.eq("id", id)
			.select();

	deleteMemo = async (id: MemoRow["id"]) =>
		this.getTable(SUPABASE.table.memo)
			.delete()
			.eq("id", id)
			.select();

	deleteMemos = async (idList: MemoRow["id"][]) =>
		this.getTable(SUPABASE.table.memo)
			.delete()
			.in("id", idList)
			.select();
}
