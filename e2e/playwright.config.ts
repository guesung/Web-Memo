import { defineConfig, devices } from "@playwright/test";
import { AUTH_STORAGE_STATE_PATH } from "./tests/lib/constants";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	maxFailures: 0,
	// 테스트마다 확장을 올린 크로미움을 새로 띄운다. 코어 수를 따라가는 기본값은
	// 개발 머신에서 워커가 서로 자원을 뺏어 로그인조차 타임아웃을 낸다.
	// CI 러너는 코어가 적어 기본값으로도 2개라 그대로 둔다.
	workers: process.env.CI ? undefined : 4,
	reporter: [["html", { open: "on-failure" }]],
	// 실행 ID(E2E_RUN_ID)를 정해 워커와 teardown이 같은 네임스페이스를 보게 한다.
	globalSetup: "./globalSetup.ts",
	// `*.real.test.ts`는 모킹 없이 실제 Supabase를 치므로, 실행이 끝나면 이번 실행이 남긴 메모·카테고리를 지운다.
	globalTeardown: "./globalTeardown.ts",
	webServer: {
		command: "pnpm run -w dev:web:preview",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		stdout: "ignore",
		// preview가 next build를 거치므로 기본 60초로는 부족하다.
		timeout: 5 * 60 * 1000,
	},
	use: {
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		baseURL: "http://localhost:3000",
	},
	// 폴더는 테스트 대상으로 나눈다. web은 확장 없는 일반 브라우저라 로그인 세션을 setup이 한 번 만들어
	// 나눠 쓰고, extension·hybrid는 확장을 올린 persistent context라 테스트마다 로그인한다.
	// 실제 Supabase 데이터를 읽거나 쓰는 테스트는 파일명을 `*.real.test.ts`로 짓는다.
	projects: [
		{
			name: "setup",
			testMatch: /auth\.setup\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "web",
			testDir: "./tests/web",
			dependencies: ["setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: AUTH_STORAGE_STATE_PATH,
			},
		},
		{
			name: "extension",
			testDir: "./tests/extension",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "hybrid",
			testDir: "./tests/hybrid",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	timeout: 60 * 1000,
});
