import { GENERATED_PAGE_PATHS } from "./generatedPagePaths";

/**
 * page.tsx가 없어 자동 생성되지 않는 경로.
 *
 * @description
 * 웹 페이지 경로는 generatedPagePaths.ts가 page.tsx에서 생성한다. 여기에는 외부 도메인·
 * route handler·페이지 없는 redirect 대상처럼 생성기가 찾을 수 없는 것만 둔다.
 * 생성분과 키가 겹치면 Path.test.ts가 실패한다.
 */
export const MANUAL_PATHS = {
	error: "/error",
	kakaoLogin: "/accounts.kakao.com",
	googleLogin: "/accounts.google.com",
	auth: "/auth",
	uninstall: "/uninstall",
	callbackOAuth: "/auth/callback",
	callbackEmail: "/auth/callback-email",
};

/**
 * 웹 경로 전체. 자동 생성된 페이지 경로와 MANUAL_PATHS를 합친다.
 */
export const PATHS = {
	...GENERATED_PAGE_PATHS,
	...MANUAL_PATHS,
};
