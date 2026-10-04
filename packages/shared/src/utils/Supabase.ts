/** MemoService 도메인 서비스의 기존 공개 경로를 유지한다. */

/** 관리자 서비스와 조회 데이터 계약을 제공한다. */
export {
	AdminService,
	FEEDBACK_PAGE_SIZE,
	type IFActiveUsersStats as ActiveUsersStats,
	type IFAdminStats as AdminStats,
	type IFAdminStatsParams,
	type IFAdminUser as AdminUser,
	type IFAdminUsersResponse as AdminUsersResponse,
	type IFFeedback,
	type IFFeedbacksResponse,
	type IFGetAdminUsersParams as GetAdminUsersParams,
	type IFGetFeedbacksParams,
	type IFUserGrowthData as UserGrowthData,
	type IFUserGrowthParams,
} from "./supabase/adminService";
/** AuthService 도메인 서비스의 기존 공개 경로를 유지한다. */
export { AuthService } from "./supabase/authService";
/** 블로그 정주행 RPC 서비스 함수와 오류 계약을 제공한다. */
export {
	BlogReadingError,
	getBlogReadingPage,
	getBlogReadingSummary,
	type IFGetBlogReadingPageParams,
	requestBlogSync,
	setBlogSubscription,
	type TBlogReadingErrorCode,
	toBlogReadingError,
} from "./supabase/blogReadingService";
/** CategoryService 도메인 서비스의 기존 공개 경로를 유지한다. */
export { CategoryService } from "./supabase/categoryService";
/** 즐겨찾기 서비스와 입력 계약을 제공한다. */
export {
	FavoriteService,
	type IFFavoriteInput,
	type TFavoriteRow,
} from "./supabase/favoriteService";
/** FeedbackService 도메인 서비스의 기존 공개 경로를 유지한다. */
export { FeedbackService } from "./supabase/feedbackService";
/** 하이라이트 서비스와 조회 데이터 계약을 제공한다. */
export {
	type HighlightCountRow,
	type HighlightPageCursor,
	HighlightService,
	type IFHighlightCountByPageKeyRow,
} from "./supabase/highlightService";
export { type IFMemoPageCursor, MemoService } from "./supabase/memoService";
/** NoticeService 도메인 서비스의 기존 공개 경로를 유지한다. */
export { NoticeService } from "./supabase/noticeService";
/** SettingService 도메인 서비스의 기존 공개 경로를 유지한다. */
export { SettingService } from "./supabase/settingService";
