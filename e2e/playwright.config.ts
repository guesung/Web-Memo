import { defineConfig, devices } from "@playwright/test";

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
	projects: [
		{
			name: "parallel",
			use: { ...devices["Desktop Chrome"] },
			testDir: "./tests/parallel",
			fullyParallel: true,
			workers: undefined,
		},
		{
			name: "integration",
			use: { ...devices["Desktop Chrome"] },
			testDir: "./tests/integration",
			fullyParallel: true,
			workers: undefined,
		},
		{
			name: "mocked",
			use: { ...devices["Desktop Chrome"] },
			testDir: "./tests/mocked",
			fullyParallel: true,
			workers: undefined,
		},
	],
	timeout: 60 * 1000,
});
