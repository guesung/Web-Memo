import path from "node:path";

export const LANGUAGE = "en";

/** 테스트가 띄우는 웹 서버 주소. playwright.config의 baseURL과 목 쿠키가 같은 값을 써야 한다. */
export const WEB_BASE_URL = "http://localhost:3000";
export const EXAMPLE_URL = "https://example.com";

/**
 * setup 프로젝트가 로그인 세션을 저장하고 web 프로젝트가 읽는 storageState 파일 경로.
 * @description `auth.setup.ts`와 `playwright.config.ts`가 같은 파일을 가리켜야 하므로 한곳에 둔다.
 * 실행 위치(cwd)와 무관하도록 이 파일 기준 절대 경로(`e2e/.auth/user.json`)로 만든다.
 */
export const AUTH_STORAGE_STATE_PATH = path.join(
	__dirname,
	"..",
	"..",
	".auth",
	"user.json",
);
