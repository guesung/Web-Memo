#!/usr/bin/env node
/** 읽기 전용 운영 감사. --output <파일>에 JSON을 저장하며 오류 1, 경고만 있으면 0입니다. */
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { auditSupabase, formatAuditAnnotation, formatAuditSummary } from "./lib/supabase-audit.mjs";

const main = async () => {
	const args = process.argv.slice(2);
	if (args.length !== 0 && (args.length !== 2 || args[0] !== "--output" || !args[1])) {
		throw new Error("Invalid arguments");
	}
	let manifest;
	try {
		manifest = JSON.parse(readFileSync(new URL("../supabase-audit-manifest.json", import.meta.url), "utf8"));
	} catch {
		manifest = null;
	}
	const result = await auditSupabase({ manifest, token: process.env.SUPABASE_ACCESS_TOKEN });
	const json = JSON.stringify(result, null, 2);
	console.log(json);
	if (args[1]) {
		writeFileSync(args[1], `${json}\n`);
	}
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${formatAuditSummary(result)}\n`);
	}
	if (process.env.GITHUB_ACTIONS === "true") {
		for (const finding of result.findings) {
			console.log(formatAuditAnnotation(finding));
		}
	}
	process.exitCode = result.exitCode;
};

try {
	await main();
} catch {
	console.error("Supabase 감사 실행 또는 결과 저장에 실패했습니다");
	process.exitCode = 1;
}
