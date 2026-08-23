import dotenv from "dotenv";
import { defineConfig } from "tsup";

const BUILD_ENV = process.env.BUILD_ENV ?? "development";

export default defineConfig({
	entry: ["src/index.ts"],
	sourcemap: true,
	clean: true,
	// 추적되는 환경별 파일을 먼저 읽고, 추적되지 않는 .env로 로컬에서 덮어씁니다.
	// BUILD_ENV는 맨 뒤에 둡니다. 파일 안의 값이 이기면 파일 선택 기준을 파일
	// 내용으로 뒤집으려는 시도가 다시 생기는데, 선택은 읽기 전에 끝나 있습니다.
	env: {
		...dotenv.config({ path: `.env.${BUILD_ENV}` }).parsed,
		...dotenv.config({ path: ".env" }).parsed,
		BUILD_ENV,
	},
	dts: true,
	format: ["esm", "cjs"],
});
