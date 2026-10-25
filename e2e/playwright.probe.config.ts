import { defineConfig, devices } from "@playwright/test";

/**
 * 운영 사이트를 대상으로 도는 프로브 설정.
 * @description 기본 설정(playwright.config.ts)과 달리 로컬 서버를 띄우지 않고 로그인 세션도
 * 만들지 않는다. 프로브는 운영에 아무것도 남기지 않아야 하므로 쓰기 동작을 하지 않는다.
 * 대상은 PROBE_BASE_URL로 바꿀 수 있고 기본값은 운영 도메인이다.
 */
export default defineConfig({
	testDir: "./probes",
	testMatch: /\.probe\.ts$/,
	forbidOnly: !!process.env.CI,
	// 한 번 실패도 그대로 알린다. 재시도로 통과시키면 간헐적으로 깨지는 상태가 가려진다.
	retries: 0,
	workers: 1,
	reporter: [["list"]],
	use: {
		...devices["Desktop Chrome"],
		baseURL: process.env.PROBE_BASE_URL ?? "https://webmemo.xyz",
		trace: "retain-on-failure",
	},
});
