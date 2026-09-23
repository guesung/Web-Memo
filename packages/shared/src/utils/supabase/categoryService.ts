import { SUPABASE } from "../../constants";
import type {
	CategoryRow,
	CategoryTable,
	MemoSupabaseClient,
} from "../../types";

/** 메모 카테고리의 조회와 변경을 처리한다. */
export class CategoryService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	insertCategory = async (request: CategoryTable["Insert"]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.category)
			.insert(request)
			.select();

	upsertCategories = async (request: CategoryTable["Insert"][]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.category)
			.upsert(request)
			.select();

	getCategories = async () =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.category)
			.select("*")
			.order("created_at", { ascending: false });

	updateCategory = async ({
		id,
		request,
	}: {
		id: CategoryRow["id"];
		request: CategoryTable["Update"];
	}) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.category)
			.update(request)
			.eq("id", id)
			.select();

	deleteCategory = async (id: CategoryRow["id"]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.category)
			.delete()
			.eq("id", id)
			.select();
}
