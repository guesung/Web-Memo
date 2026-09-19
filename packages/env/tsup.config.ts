import dotenv from "dotenv";
import { defineConfig } from "tsup";

// Vercel Git 연동 빌드는 GitHub Actions를 거치지 않아 셸에 BUILD_ENV가 없습니다.
// 그대로 두면 development로 구워져 운영 사이트에 localhost:3000이 실리므로,
// Vercel이 빌드에 넣어주는 VERCEL_ENV로 CI(cd-web.yml)와 같은 기준을 적용합니다.
// (production → production, preview → staging)
const getBuildEnvFromVercel = () => {
	if (process.env.VERCEL_ENV === "production") {
		return "production";
	}
	if (process.env.VERCEL_ENV === "preview") {
		return "staging";
	}

	return undefined;
};

const BUILD_ENV =
	process.env.BUILD_ENV ?? getBuildEnvFromVercel() ?? "development";

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
