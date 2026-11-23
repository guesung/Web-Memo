import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";
import { TEST_ENV } from "./test/testEnv.js";

export default defineConfig({
	test: {
		include: ["test/**/*.e2e-spec.ts"],
		globals: true,
		env: TEST_ENV,
		// main.ts 맨 위의 import "reflect-metadata"와 같은 역할. 데코레이터 메타데이터를 읽는 Reflect API를 깐다
		setupFiles: ["reflect-metadata"],
		root: "./",
	},
	plugins: [swc.vite({ module: { type: "es6" } })],
});
