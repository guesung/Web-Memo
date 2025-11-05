import { SUPABASE } from "../../constants";
import type {
	CategoryRow,
	CategoryTable,
	MemoSupabaseClient,
} from "../../types";
import { BaseSupabaseService } from "./base.service";

/**
 * CategoryService - 카테고리 관련 Supabase 작업을 처리하는 서비스
 */
export class CategoryService extends BaseSupabaseService {
	constructor(supabaseClient: MemoSupabaseClient) {
		super(supabaseClient);
	}

	insertCategory = async (request: CategoryTable["Insert"]) =>
		this.getTable(SUPABASE.table.category)
			.insert(request)
			.select();

	upsertCategories = async (request: CategoryTable["Insert"][]) =>
		this.getTable(SUPABASE.table.category)
			.upsert(request)
			.select();

	getCategories = async () =>
		this.getTable(SUPABASE.table.category)
			.select("*")
			.order("created_at", { ascending: false });

	updateCategory = async ({
		id,
		request,
	}: {
		id: CategoryRow["id"];
		request: CategoryTable["Update"];
	}) =>
		this.getTable(SUPABASE.table.category)
			.update(request)
			.eq("id", id)
			.select();

	deleteCategory = async (id: CategoryRow["id"]) =>
		this.getTable(SUPABASE.table.category)
			.delete()
			.eq("id", id)
			.select();
}
