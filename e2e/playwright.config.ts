import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	maxFailures: 0,
	reporter: [["html", { open: "on-failure" }]],
	webServer: {
		command: "pnpm run -w dev:web:preview",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		stdout: "ignore",
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
			workers:undefined
		},
		{
			name: "serial",
			use: { ...devices["Desktop Chrome"] },
			testDir: "./tests/serial",
			fullyParallel: false,
			workers: 1,
		},
	],
	timeout: 60 * 1000,
});
