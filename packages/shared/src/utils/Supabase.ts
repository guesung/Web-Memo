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
			.select("*, category(id, name, color)")
			.eq("url", url);

	getMemoById = async (id: number) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.select("*, category(id, name, color)")
			.eq("id", id);

	upsertMemos = async (request: GetMemoResponse[]) => {
		const requestMapped = request.map(({ category, ...rest }) => ({
			...rest,
			category_id: category?.id ?? rest.category_id,
		}));
		return this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.upsert(requestMapped)
			.select();
	};
	/**
	 * @deprecated Use getMemosPaginated for better performance.
	 * This method fetches up to 2000 records at once which is inefficient.
	 */
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
			this.supabaseClient
				.schema(SUPABASE.table.memo)
				.from(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.order("updated_at", { ascending: false })
				.range(2000, 2999),
			this.supabaseClient
				.schema(SUPABASE.table.memo)
				.from(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.order("updated_at", { ascending: false })
				.range(3000, 3999),
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
			.select()
			.throwOnError();

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

export interface ActiveUsersStats {
	dailyActiveUsers: number;
	weeklyActiveUsers: number;
	monthlyActiveUsers: number;
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
			// @ts-expect-error RPC function types not generated in schema
			.rpc("get_admin_stats");

	getUserGrowth = async (daysAgo: number = 30) =>
		this.supabaseClient
			.schema(SUPABASE.schema.memo)
			// @ts-expect-error RPC function types not generated in schema
			.rpc("get_user_growth", {
				days_ago: daysAgo,
			});

	getActiveUsersStats = async () =>
		this.supabaseClient
			.schema(SUPABASE.schema.memo)
			// @ts-expect-error RPC function types not generated in schema
			.rpc("get_active_users_stats");

	getUsers = async ({ searchQuery }: GetAdminUsersParams = {}) =>
		this.supabaseClient
			.schema(SUPABASE.schema.memo)
			// @ts-expect-error RPC function types not generated in schema
			.rpc("get_admin_users", {
				search_query: searchQuery || null,
			});

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
