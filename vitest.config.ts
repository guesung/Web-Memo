import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@src/modules/i18n/util.client": fileURLToPath(
				new URL("./apps/web/src/modules/i18n/util.client.ts", import.meta.url),
			),
			"@src": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
			// @web-memo/env의 exports는 dist만 가리키는데, CI의 ci 잡은 빌드를 하지 않아
			// dist가 없습니다. 소스를 직접 보게 해 빌드 여부와 무관하게 테스트가 돌게 합니다.
			"@web-memo/env": fileURLToPath(
				new URL("./packages/env/src/index.ts", import.meta.url),
			),
		},
	},
	test: {
		include: ["**/*.test.ts"],
		// e2e는 Playwright 테스트 폴더만 뺀다. e2e/tests/lib의 순수 함수 테스트(namespace.test.ts)는 Vitest가 돌린다.
		exclude: [
			"e2e/tests/web/**",
			"e2e/tests/extension/**",
			"e2e/tests/hybrid/**",
			"e2e/node_modules/**",
			"**/node_modules/**",
			"**/dist/**",
		],
		globals: true,
	},
});
