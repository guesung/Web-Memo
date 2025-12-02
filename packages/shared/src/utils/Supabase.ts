import { SUPABASE } from "../constants";
import type {
	CategoryRow,
	CategoryTable,
	FeedbackSupabaseClient,
	FeedbackTable,
	GetMemoResponse,
	MemoRow,
	MemoSupabaseClient,
	MemoTable,
} from "../types";

export class MemoService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	insertMemo = async (request: MemoTable["Insert"]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.insert(request)
			.select();

	getMemoByUrl = async (url: string) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.select("*")
			.eq("url", url)
			.maybeSingle();

	upsertMemos = async (request: GetMemoResponse[]) => {
		// TODO: 직접 카테고리를 제거하는 로직 수정 필요
		const requestWithoutCategory = request.map(({ category, ...rest }) => rest);
		return this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.upsert(requestWithoutCategory)
			.select();
	};
	getMemos = async () => {
		const [firstBatch, secondBatch] = await Promise.all([
			this.supabaseClient
				.schema(SUPABASE.table.memo)
				.from(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.order("updated_at", { ascending: false })
				.range(0, 999),
			this.supabaseClient
				.schema(SUPABASE.table.memo)
				.from(SUPABASE.table.memo)
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
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.update(request)
			.eq("id", id)
			.select();

	deleteMemo = async (id: MemoRow["id"]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.delete()
			.eq("id", id)
			.select();

	deleteMemos = async (idList: MemoRow["id"][]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.delete()
			.in("id", idList)
			.select();
}

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

export class AuthService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	getUser = () => this.supabaseClient.auth.getUser();

	checkUserLogin = async () => {
		const user = await this.supabaseClient.auth.getUser();
		return !!user?.data?.user;
	};

	signout = () => this.supabaseClient.auth.signOut();
}

export class FeedbackService {
	constructor(
		private readonly feedbackSupabaseClient: FeedbackSupabaseClient,
	) {}

	insertFeedback = async (feedback: FeedbackTable["Insert"]) =>
		this.feedbackSupabaseClient.from("feedbacks").insert(feedback);
}
