process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

import { defineConfig, devices } from "@playwright/test";
import { AUTH_STORAGE_STATE_PATH } from "./tests/lib/constants";

export default defineConfig({
	testDir: "./probes",
	testMatch: /category-streaming\.spec\.ts$/,
	workers: 1,
	retries: 0,
	reporter: [["./probes/memo-performance/safeReporter.ts"]],
	use: {
		...devices["Desktop Chrome"],
		baseURL: process.env.CATEGORY_STREAMING_BASE_URL ?? "http://localhost:3116",
		storageState: AUTH_STORAGE_STATE_PATH,
		trace: "off",
		screenshot: "off",
		video: "off",
	},
	timeout: 30_000,
});
