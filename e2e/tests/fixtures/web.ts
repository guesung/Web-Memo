import { test as base } from "@playwright/test";

/**
 * 확장 없이 일반 브라우저로 도는 web 프로젝트용 test.
 * @description 로그인 상태는 setup 프로젝트(`auth.setup.ts`)가 저장한 storageState로 받는다.
 * 확장이 없으므로 설치 탭 감시와 언어 쿠키 복구가 필요 없다. locale은 확장 fixture와 같게
 * en-US로 고정해, 언어 경로 없는 이동이 브라우저 언어(ko)로 떨어지지 않게 한다.
 */
export const test = base.extend({
	baseURL: "http://localhost:3000",
	locale: "en-US",
});

/** web 프로젝트용 expect. */
export const expect = test.expect;
