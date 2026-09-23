import { SUPABASE } from "../../constants";
import type { MemoSupabaseClient } from "../../types";

/** 관리자 조회에 사용하는 IFAdminStats 데이터 계약이다. */
export interface IFAdminStats {
	totalUsers: number;
	totalMemos: number;
	todayMemos: number;
	weeklyMemos: number;
	monthlyMemos: number;
	quarterlyMemos: number;
}

/** 관리자 조회에 사용하는 IFActiveUsersStats 데이터 계약이다. */
export interface IFActiveUsersStats {
	dailyActiveUsers: number;
	weeklyActiveUsers: number;
	monthlyActiveUsers: number;
}

/** 관리자 조회에 사용하는 IFUserGrowthData 데이터 계약이다. */
export interface IFUserGrowthData {
	date: string;
	count: number;
}

/** 관리자 조회에 사용하는 IFAdminUser 데이터 계약이다. */
export interface IFAdminUser {
	user_id: string;
	email: string | null;
	nickname: string | null;
	created_at: string;
	memo_count: number;
	/**
	 * 마지막으로 메모를 만들거나 고친 시각. 메모가 한 건도 없으면 null이다.
	 * @description 로그인 시각(auth.users.last_sign_in_at)이 아니다. 세션이 오래 유지되는
	 * 서비스라 그 값은 매일 쓰는 사람도 몇 달 전으로 찍힌다.
	 */
	last_activity_at: string | null;
}

/** 관리자 조회에 사용하는 IFAdminUsersResponse 데이터 계약이다. */
export interface IFAdminUsersResponse {
	users: IFAdminUser[];
	totalCount: number;
}

/** 관리자 화면이 읽어가는 피드백 한 건. `id`는 bigint라 number다. */
export interface IFFeedback {
	id: number;
	content: string | null;
	user_id: string | null;
	email: string | null;
	created_at: string;
}

/** 피드백 목록 조회 조건. 검색어는 내용(content)에만 걸린다. */
export interface IFGetFeedbacksParams {
	searchQuery?: string;
	page?: number;
	pageSize?: number;
}

/** 피드백 목록 조회 결과. `count`는 필터를 적용한 전체 건수다. */
export interface IFFeedbacksResponse {
	data: IFFeedback[];
	count: number;
}

/** 피드백 목록의 기본 페이지 크기 */
export const FEEDBACK_PAGE_SIZE = 25;

/** 관리자 조회에 사용하는 IFGetAdminUsersParams 데이터 계약이다. */
export interface IFGetAdminUsersParams {
	searchQuery?: string;
}

/** 대시보드 통계 RPC 인자 */
export interface IFAdminStatsParams {
	/** true면 관리자 본인의 데이터도 센다. 생략하면 뺀다. */
	includeAdmin?: boolean;
}

/** 사용자 증가 추이 RPC 인자 */
export interface IFUserGrowthParams extends IFAdminStatsParams {
	/** 오늘로부터 거슬러 올라갈 일수 */
	daysAgo?: number;
}

/** 관리자 통계와 사용자 및 피드백 조회를 처리한다. */
export class AdminService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	getAdminStats = async ({ includeAdmin = false }: IFAdminStatsParams = {}) =>
		this.supabaseClient
			.schema(SUPABASE.schema.memo)
			// @ts-expect-error RPC function types not generated in schema
			.rpc("get_admin_stats", {
				include_admin: includeAdmin,
			});

	getUserGrowth = async ({
		daysAgo = 30,
		includeAdmin = false,
	}: IFUserGrowthParams = {}) =>
		this.supabaseClient
			.schema(SUPABASE.schema.memo)
			// @ts-expect-error RPC function types not generated in schema
			.rpc("get_user_growth", {
				days_ago: daysAgo,
				include_admin: includeAdmin,
			});

	getActiveUsersStats = async ({
		includeAdmin = false,
	}: IFAdminStatsParams = {}) =>
		this.supabaseClient
			.schema(SUPABASE.schema.memo)
			// @ts-expect-error RPC function types not generated in schema
			.rpc("get_active_users_stats", {
				include_admin: includeAdmin,
			});

	getUsers = async ({ searchQuery }: IFGetAdminUsersParams = {}) =>
		this.supabaseClient
			.schema(SUPABASE.schema.memo)
			// @ts-expect-error RPC function types not generated in schema
			.rpc("get_admin_users", {
				search_query: searchQuery || null,
			});

	/**
	 * 피드백 목록을 최신순으로 읽는다.
	 * @description `feedback.feedbacks`에는 SELECT 정책이 없어 클라이언트가 직접 읽을 수 없다.
	 * 관리자 여부를 함수 안에서 판정하는 SECURITY DEFINER RPC로만 읽는다.
	 */
	getFeedbacks = async ({
		searchQuery,
		page = 1,
		pageSize = FEEDBACK_PAGE_SIZE,
	}: IFGetFeedbacksParams = {}): Promise<IFFeedbacksResponse> => {
		const { data, error } = await this.supabaseClient
			.schema(SUPABASE.schema.memo)
			// @ts-expect-error RPC function types not generated in schema
			.rpc("get_admin_feedbacks", {
				search_query: searchQuery || null,
				page_offset: (page - 1) * pageSize,
				page_limit: pageSize,
			});

		if (error) {
			throw new Error(error.message);
		}

		const response = data as IFFeedbacksResponse | null;

		return { data: response?.data ?? [], count: response?.count ?? 0 };
	};

	/**
	 * 피드백 한 건을 id로 읽는다.
	 * @description 슬랙 알림의 `?id=` 링크로 들어왔는데 그 행이 현재 페이지에 없을 때 쓴다.
	 */
	getFeedback = async (id: number): Promise<IFFeedback | null> => {
		const { data, error } = await this.supabaseClient
			.schema(SUPABASE.schema.memo)
			// @ts-expect-error RPC function types not generated in schema
			.rpc("get_admin_feedback", {
				feedback_id: id,
			});

		if (error) {
			throw new Error(error.message);
		}

		return (data as IFFeedback | null) ?? null;
	};

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
