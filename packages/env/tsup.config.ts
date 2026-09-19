import dotenv from "dotenv";
import { defineConfig } from "tsup";

const BUILD_ENV = process.env.BUILD_ENV ?? "development";

// Vercel 빌드에서 BUILD_ENV가 빠지면 development로 구워져 운영 사이트에
// localhost:3000이 실립니다. 에러 없이 배포가 성공하므로 사용자가 먼저 발견하기 전에
// 빌드 자체를 멈춥니다. 값은 Vercel 프로젝트 환경변수에 등록합니다
// (Production = production, Preview = staging).
if (process.env.VERCEL && !process.env.BUILD_ENV) {
	throw new Error(
		"Vercel 빌드에는 BUILD_ENV가 필요합니다. Vercel 프로젝트 환경변수에 Production은 production, Preview는 staging으로 등록하세요.",
	);
}

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
