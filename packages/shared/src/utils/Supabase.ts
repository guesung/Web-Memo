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

	getMemosPaginated = async ({
		cursor,
		limit = 20,
		category,
		isWish,
		searchQuery,
		sortBy = "updated_at",
	}: {
		cursor?: string;
		limit?: number;
		category?: string;
		isWish?: boolean;
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
			.order(sortBy, { ascending })
			.order("id", { ascending })
			.limit(limit);

		if (cursor) {
			if (sortBy === "title") {
				query = query.gt("title", cursor);
			} else {
				query = query.lt(sortBy, cursor);
			}
		}

		if (isWish !== undefined) {
			query = query.eq("isWish", isWish);
		}

		if (category) {
			query = query.eq("category.name", category);
		}

		if (searchQuery) {
			const pattern = `%${searchQuery}%`;
			query = query.or(`title.ilike.${pattern},memo.ilike.${pattern}`);
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

export interface AdminStats {
	totalUsers: number;
	totalMemos: number;
	todayMemos: number;
	weeklyMemos: number;
	monthlyMemos: number;
	quarterlyMemos: number;
}

export interface UserGrowthData {
	date: string;
	count: number;
}

export interface AdminUser {
	user_id: string;
	email: string | null;
	nickname: string | null;
	created_at: string;
	memo_count: number;
}

export interface AdminUsersResponse {
	users: AdminUser[];
	totalCount: number;
}

export interface GetAdminUsersParams {
	searchQuery?: string;
}

export class AdminService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	getAdminStats = async () =>
		this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.rpc("get_admin_stats" as never);

	getUserGrowth = async (daysAgo: number = 30) =>
		this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.rpc("get_user_growth" as never, {
				days_ago: daysAgo,
			} as never);

	getUsers = async ({ searchQuery }: GetAdminUsersParams = {}) =>
		this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.rpc("get_admin_users" as never, {
				search_query: searchQuery || null,
			} as never);

	checkIsAdmin = async (userId: string) => {
		const { data } = await this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("profiles")
			.select("*")
			.eq("user_id", userId)
			.single();
		return (data as { role?: string } | null)?.role === "admin";
	};
}
