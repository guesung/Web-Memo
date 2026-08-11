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
import { getMemoSearchFilter, type MemoSearchTarget } from "./memoSearchFilter";

/** 메모 목록 페이지네이션 커서. 정렬 컬럼 값과 id의 조합으로 다음 페이지 시작점을 가리킨다. */
export interface MemoPageCursor {
	value: string;
	id: number;
}

/**
 * PostgREST `.or()` 필터에 넣을 값을 인용한다.
 * @description 제목 커서처럼 사용자 데이터가 콤마·괄호를 포함해도 필터 문법이 깨지지 않게 한다.
 */
const quoteFilterValue = (value: string): string =>
	`"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

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
	 * 내보내기처럼 전체 메모가 필요한 경우에만 사용한다. 목록 조회는 getMemosPaginated를 쓴다.
	 * @description Supabase는 요청당 반환 행 수에 상한이 있으므로 마지막 페이지에 도달할 때까지 순회한다.
	 * updated_at이 같은 행의 순서가 요청마다 뒤바뀌어 누락·중복이 생기지 않도록 id를 보조 정렬 기준으로 둔다.
	 */
	getMemos = async () => {
		const PAGE_SIZE = 1000;
		const MAX_PAGE_COUNT = 100;
		const memos: GetMemoResponse[] = [];

		let page = 0;
		let result = await this.getMemoPage({ page, pageSize: PAGE_SIZE });

		while (page < MAX_PAGE_COUNT) {
			if (result.error) {
				return { ...result, data: memos };
			}

			const batch = (result.data ?? []) as GetMemoResponse[];
			memos.push(...batch);

			if (batch.length < PAGE_SIZE) {
				break;
			}

			page += 1;
			result = await this.getMemoPage({ page, pageSize: PAGE_SIZE });
		}

		return { ...result, data: memos };
	};

	/** getMemos의 페이지 단위 조회. GetMemoResponse 타입 추론의 기준이기도 하다. */
	getMemoPage = async ({
		page,
		pageSize,
	}: {
		page: number;
		pageSize: number;
	}) =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.memo)
			.select("*, category(id, name, color)")
			.order("updated_at", { ascending: false })
			.order("id", { ascending: false })
			.range(page * pageSize, (page + 1) * pageSize - 1);

	getMemosPaginated = async ({
		cursor,
		limit = 20,
		category,
		isWish,
		isStar,
		searchQuery,
		searchTarget = "all",
		sortBy = "updated_at",
	}: {
		cursor?: MemoPageCursor;
		limit?: number;
		category?: string;
		isWish?: boolean;
		isStar?: boolean;
		searchQuery?: string;
		searchTarget?: MemoSearchTarget;
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
			// 정렬 컬럼 값이 같은 행이 여러 개여도 건너뛰지 않도록 (정렬 값, id) 복합 커서를 쓴다.
			const operator = ascending ? "gt" : "lt";
			const value = quoteFilterValue(cursor.value);
			query = query.or(
				`${sortBy}.${operator}.${value},and(${sortBy}.eq.${value},id.${operator}.${cursor.id})`,
			);
		}

		if (isWish !== undefined) {
			query = query.eq("isWish", isWish);
		}

		if (isStar !== undefined) {
			query = query.eq("isStar", isStar);
		}

		if (category) {
			query = query.eq("category.name", category);
		}

		if (searchQuery) {
			query = query.or(getMemoSearchFilter(searchQuery, searchTarget));
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
