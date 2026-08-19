/** 개인정보처리방침 본문에 순서대로 노출되는 섹션 키 목록 */
export const PRIVACY_SECTIONS = [
	"scope",
	"collect",
	"not_collect",
	"use",
	"permissions",
	"share",
	"limited_use",
	"retention",
	"rights",
	"security",
	"international",
	"children",
	"changes",
	"contact",
] as const;

/** 개인정보처리방침 섹션 키 */
export type TPrivacySectionKey = (typeof PRIVACY_SECTIONS)[number];

/** "수집하는 사용자 데이터" 섹션의 하위 그룹 키 목록 */
export const PRIVACY_COLLECT_GROUPS = [
	"account",
	"content",
	"page_content",
	"usage",
	"diagnostics",
	"feedback",
	"local",
] as const;

/** 확장 프로그램 권한 설명 표에 노출되는 권한 키 목록 */
export const PRIVACY_PERMISSIONS = [
	"storage",
	"tabs",
	"sidePanel",
	"contextMenus",
	"cookies",
	"host_permissions",
] as const;

/** 데이터 처리를 위탁하는 제3자 키 목록 */
export const PRIVACY_THIRD_PARTIES = [
	"supabase",
	"openai",
	"google_auth",
	"google_analytics",
	"sentry",
	"vercel",
	"upstash",
] as const;
