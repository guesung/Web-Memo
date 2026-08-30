import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			// @web-memo/env의 exports는 dist만 가리키는데, CI의 ci 잡은 빌드를 하지 않아
			// dist가 없습니다. 소스를 직접 보게 해 빌드 여부와 무관하게 테스트가 돌게 합니다.
			"@web-memo/env": fileURLToPath(
				new URL("./packages/env/src/index.ts", import.meta.url),
			),
		},
	},
	test: {
		include: ["**/*.test.ts"],
		exclude: ["e2e/**", "**/node_modules/**", "**/dist/**"],
		globals: true,
	},
});
