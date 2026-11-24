import { defineConfig } from "prisma/config";

// `prisma generate`는 DB에 붙지 않으므로 DATABASE_URL이 없어도 된다(CI·이미지 빌드).
// DB를 읽는 명령(`prisma db pull` 등)을 쓸 때만 환경 변수로 넘긴다.
export default defineConfig({
	schema: "prisma/schema.prisma",
	datasource: {
		url: process.env.DATABASE_URL ?? "",
	},
});
