import dotenv from "dotenv";
import { defineConfig } from "tsup";

const BUILD_ENV = process.env.BUILD_ENV ?? "development";

export default defineConfig({
	entry: ["src/index.ts"],
	sourcemap: true,
	clean: true,
	// 추적되는 환경별 파일을 먼저 읽고, 추적되지 않는 .env로 로컬에서 덮어씁니다.
	env: {
		...dotenv.config({ path: `.env.${BUILD_ENV}` }).parsed,
		...dotenv.config({ path: ".env" }).parsed,
	},
	dts: true,
	format: ["esm", "cjs"],
});
