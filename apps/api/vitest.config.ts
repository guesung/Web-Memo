import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";
import { TEST_ENV } from "./test/testEnv.js";

// Vitest 기본 변환기(esbuild)는 데코레이터 메타데이터를 내보내지 않아 Nest DI가 생성자 인자를 못 찾습니다.
// SWC로 테스트 파일을 변환해 tsc 빌드와 같은 메타데이터를 남깁니다.
export default defineConfig({
	test: {
		include: ["src/**/*.spec.ts"],
		globals: true,
		env: TEST_ENV,
		// main.ts 맨 위의 import "reflect-metadata"와 같은 역할. 데코레이터 메타데이터를 읽는 Reflect API를 깐다
		setupFiles: ["reflect-metadata"],
		root: "./",
	},
	plugins: [swc.vite({ module: { type: "es6" } })],
});
