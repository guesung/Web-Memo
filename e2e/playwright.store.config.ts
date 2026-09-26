import { defineConfig, devices } from "@playwright/test";

/**
 * 크롬 웹스토어 스크린샷(1280×800, ko·en 각 5장)을 만드는 설정.
 * @description 테스트가 아니라 이미지 생성 파이프라인이다. capture가 확장·웹을 띄워 원본 화면을 찍고,
 * compose가 그 원본을 template.html에 넣어 최종 PNG를 만든다. compose는 capture에 의존하므로
 * `pnpm -F e2e exec playwright test -c playwright.store.config.ts` 한 번으로 순서대로 돈다.
 * 로그인만 실제 Supabase를 쓰고 메모·카테고리·요약은 모두 목이다. 결과는 `store-screenshots/output/`에 쌓인다.
 */
export default defineConfig({
	testDir: "./store-screenshots",
	forbidOnly: !!process.env.CI,
	retries: 0,
	// 두 언어가 같은 테스트 계정으로 로그인하고 같은 dist를 복사하므로 한 번에 하나씩 돈다.
	workers: 1,
	reporter: [["list"]],
	timeout: 3 * 60 * 1000,
	webServer: {
		command: "pnpm run -w dev:web:preview",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		stdout: "ignore",
		timeout: 5 * 60 * 1000,
	},
	use: {
		...devices["Desktop Chrome"],
		baseURL: "http://localhost:3000",
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "capture",
			testMatch: /capture\.spec\.ts/,
		},
		{
			name: "compose",
			testMatch: /compose\.spec\.ts/,
			dependencies: ["capture"],
		},
	],
});
