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
	SettingTable,
} from "../types";
import { getMemoSearchFilter } from "./memoSearchFilter";

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
			.is("deleted_at", null)
			.eq("url", url);

	getMemoById = async (id: number) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.select("*, category(id, name, color)")
			.is("deleted_at", null)
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
				.is("deleted_at", null)
				.order("updated_at", { ascending: false })
				.range(0, 999),
			this.supabaseClient
				.schema(SUPABASE.table.memo)
				.from(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.is("deleted_at", null)
				.order("updated_at", { ascending: false })
				.range(1000, 1999),
			this.supabaseClient
				.schema(SUPABASE.table.memo)
				.from(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.is("deleted_at", null)
				.order("updated_at", { ascending: false })
				.range(2000, 2999),
			this.supabaseClient
				.schema(SUPABASE.table.memo)
				.from(SUPABASE.table.memo)
				.select("*, category(id, name, color)")
				.is("deleted_at", null)
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
		isStar,
		isReading,
		searchQuery,
		sortBy = "updated_at",
	}: {
		cursor?: string;
		limit?: number;
		category?: string;
		isWish?: boolean;
		isStar?: boolean;
		isReading?: boolean;
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
			.is("deleted_at", null)
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

		if (isStar !== undefined) {
			query = query.eq("isStar", isStar);
		}

		if (isReading !== undefined) {
			query = query.eq("isReading", isReading);
		}

		if (category) {
			query = query.eq("category.name", category);
		}

		if (searchQuery) {
			query = query.or(getMemoSearchFilter(searchQuery));
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

	/**
	 * 메모를 휴지통으로 보낸다.
	 * @description 행을 지우지 않고 `deleted_at`만 찍는다. 하이라이트·카테고리
	 * 관계가 그대로 남아 복구가 UPDATE 한 번으로 끝난다. 영구 삭제는
	 * {@link deleteMemosPermanently}가 따로 맡는다.
	 */
	deleteMemo = async (id: MemoRow["id"]) => this.deleteMemos([id]);

	/** 메모 여러 개를 휴지통으로 보낸다 */
	deleteMemos = async (idList: MemoRow["id"][]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.update({ deleted_at: new Date().toISOString() })
			.in("id", idList)
			.select();

	/**
	 * 휴지통에 있는 메모를 최근에 버린 순으로 가져온다.
	 * @description 다른 조회는 전부 `deleted_at is null`로 거르므로, 삭제된 행을
	 * 읽는 경로는 여기 하나뿐이다.
	 */
	getDeletedMemos = async () =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.select("*, category(id, name, color)")
			.not("deleted_at", "is", null)
			.order("deleted_at", { ascending: false });

	/** 휴지통의 메모를 되살린다 */
	restoreMemos = async (idList: MemoRow["id"][]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.update({ deleted_at: null })
			.in("id", idList)
			.select();

	/**
	 * 메모를 완전히 지운다. 되돌릴 수 없다.
	 * @description 휴지통 안에서만 부른다. 실수로 살아있는 메모를 지우지 않도록
	 * `deleted_at`이 찍힌 행으로 대상을 한 번 더 좁힌다.
	 */
	deleteMemosPermanently = async (idList: MemoRow["id"][]) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.delete()
			.not("deleted_at", "is", null)
			.in("id", idList)
			.select();
}

/** {@link HighlightService}와 {@link HighlightPageCursor}, {@link HighlightCountRow}는 파일 길이 제한으로 별도 파일로 분리되어 있다. */
export {
	type HighlightCountRow,
	type HighlightPageCursor,
	HighlightService,
} from "./supabase/highlightService";

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

export class SettingService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	getSetting = async () =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.setting)
			.select("*")
			.maybeSingle();

	upsertSetting = async (request: Omit<SettingTable["Insert"], "user_id">) => {
		const {
			data: { user },
		} = await this.supabaseClient.auth.getUser();

		return this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.setting)
			.upsert({ ...request, user_id: user?.id }, { onConflict: "user_id" })
			.select()
			.single();
	};
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
