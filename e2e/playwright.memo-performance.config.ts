process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

import { defineConfig, devices } from "@playwright/test";
import { AUTH_STORAGE_STATE_PATH } from "./tests/lib/constants";

export default defineConfig({
	testDir: ".",
	outputDir: "./.memo-performance/playwright-artifacts",
	testMatch: /(?:auth\.setup\.ts|memo-performance\.spec\.ts)$/,
	fullyParallel: false,
	forbidOnly: true,
	retries: 0,
	workers: 1,
	reporter: [["./probes/memo-performance/safeReporter.ts"]],
	webServer: {
		command: "pnpm run -w dev:web:preview",
		url: "http://localhost:3000",
		reuseExistingServer: process.env.MEMO_PERF_REUSE_PREVIEW === "1",
		stdout: "ignore",
		stderr: "ignore",
		timeout: 5 * 60 * 1000,
	},
	use: {
		baseURL: "http://localhost:3000",
		trace: "off",
		screenshot: "off",
		video: "off",
	},
	projects: [
		{
			name: "setup",
			testDir: "./tests",
			testMatch: /auth\.setup\.ts$/,
			use: {
				...devices["Desktop Chrome"],
				trace: "off",
				screenshot: "off",
				video: "off",
			},
		},
		{
			name: "memo-performance",
			testDir: "./probes",
			testMatch: /memo-performance\.spec\.ts$/,
			dependencies: ["setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: AUTH_STORAGE_STATE_PATH,
				trace: "off",
				screenshot: "off",
				video: "off",
			},
		},
	],
	timeout: 45_000,
});
