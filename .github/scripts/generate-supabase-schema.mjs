import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSchemaDocument } from "./lib/supabase-schema.mjs";

/** API와 렌더링이 모두 성공한 뒤 문서를 원자적으로 교체하거나 바이트를 비교합니다. */
export const generateSchema = async (options = {}) => {
	const outputPath = options.outputPath ?? fileURLToPath(new URL("../../docs/supabase-schema.md", import.meta.url));
	const document = Buffer.from(await fetchSchemaDocument(options.token ?? process.env.SUPABASE_ACCESS_TOKEN));
	if (options.check) {
		let existing;
		try {
			existing = await readFile(outputPath);
		} catch (error) {
			if (error.code !== "ENOENT") { throw error; }
		}
		if (!existing?.equals(document)) {
			throw new Error("Supabase 스키마 문서가 없거나 최신 상태가 아닙니다. pnpm generate-supabase-schema 를 실행하세요.");
		}
		return;
	}
	const temporaryPath = `${outputPath}.${randomUUID()}.tmp`;
	try {
		await writeFile(temporaryPath, document, { flag: "wx" });
		await rename(temporaryPath, outputPath);
	} finally {
		await rm(temporaryPath, { force: true });
	}
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		if (process.argv.slice(2).some((argument) => argument !== "--check")) {
			throw new Error("사용법: node .github/scripts/generate-supabase-schema.mjs [--check]");
		}
		await generateSchema({ check: process.argv.includes("--check") });
		console.log("Supabase 스키마 문서 검증/생성이 완료되었습니다.");
	} catch (error) {
		const token = process.env.SUPABASE_ACCESS_TOKEN;
		console.error(token ? error.message.replaceAll(token, "[REDACTED]") : error.message);
		process.exitCode = 1;
	}
}
