#!/usr/bin/env node
/**
 * 코드 컨벤션 원장(docs/code-conventions.yaml)의 형식을 검사합니다.
 * .github/workflows/ci.yml 의 'Code conventions ledger' 스텝이 호출합니다.
 *
 * 사용:
 *   node .github/scripts/conventions/check-code-conventions.mjs [원장 경로]
 *   경로를 생략하면 레포 루트의 docs/code-conventions.yaml 을 검사합니다. 위반이면 exit 1
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseLedger, validateLedger } from "./code-conventions.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const ledgerPath = process.argv[2]
	? resolve(process.argv[2])
	: resolve(REPO_ROOT, "docs/code-conventions.yaml");

let text;

try {
	text = readFileSync(ledgerPath, "utf8");
} catch (error) {
	console.error(`원장을 읽을 수 없습니다: ${ledgerPath} (${error.message})`);
	process.exit(1);
}

let data;

try {
	data = parseLedger(text);
} catch (error) {
	console.error(`원장 YAML을 해석할 수 없습니다: ${ledgerPath}\n${error.message}`);
	process.exit(1);
}

const errors = validateLedger(data);

if (errors.length > 0) {
	console.error(`코드 컨벤션 원장 위반 ${errors.length}건 (${ledgerPath})`);
	for (const message of errors) {
		console.error(`  - ${message}`);
	}
	process.exit(1);
}

console.log(`코드 컨벤션 원장 통과: 규칙 ${data.rules.length}개`);
