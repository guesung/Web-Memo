#!/usr/bin/env node
/**
 * 블로그 정주행 카탈로그 수집기. chore-blog-catalog.yml이 부릅니다.
 *
 *   node .github/scripts/blog-reading/collect.mjs --source all|toss|daangn --trigger daily|request|manual
 *        [--force] [--dry-run] [--smoke] [--headed] [--time-limit-minutes 40]
 *
 * 소스마다 claim(lease) -> 수집(배치 저장·checkpoint) -> finish(종료 증거 검증) 순서로 돌고, 어떤 이유로든 완료하지 못하면
 * fail로 사유를 기록합니다. 기존 글은 지우지 않으며 완료로 위장하지 않습니다.
 * 수집 URL은 tossSource.mjs·daangnParser.mjs의 상수로 고정돼 있고 사용자 입력을 받지 않습니다.
 *
 * 환경 변수
 *   BLOG_CATALOG_INGEST_SECRET  (필수, --dry-run·--smoke 제외) 수집 전용 secret. 로그에 출력하지 않습니다
 *   BLOG_CATALOG_INGEST_URL     (선택) 수집 엔드포인트. 기본은 운영 Supabase 프로젝트
 *
 * 종료 코드
 *   0 정상(완료 또는 건너뜀)   1 실패(수집 실패·stale lease·기록 실패)
 *   2 사용법·설정 오류         3 원본 사이트가 접근을 차단함(blocked). 다른 실패가 함께 있으면 1
 *   --smoke는 접근 가능하면 0, 차단이면 3, 응답을 못 읽으면 1
 */

import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { collectDaangn, loadChromium, smokeDaangn } from "./daangnSource.mjs";
import { createIngestClient, DEFAULT_INGEST_URL, IngestError, isStaleLeaseError } from "./ingestClient.mjs";
import { SourceError } from "./sourceError.mjs";
import { collectToss } from "./tossSource.mjs";

export const EXIT_OK = 0;
export const EXIT_FAILED = 1;
export const EXIT_USAGE = 2;
export const EXIT_BLOCKED = 3;

const SOURCES = ["toss", "daangn"];
const TRIGGERS = ["daily", "request", "manual"];
const DEFAULT_TIME_LIMIT_MINUTES = 40;

class UsageError extends Error {}

/** 명령행 인자를 해석합니다. 모르는 인자는 조용히 무시하지 않고 던집니다 */
export const parseArgs = (argv) => {
	const args = { source: "all", trigger: "manual", force: false, dryRun: false, smoke: false, headed: false, timeLimitMinutes: DEFAULT_TIME_LIMIT_MINUTES };

	for (let index = 0; index < argv.length; index += 1) {
		const flag = argv[index];

		if (flag === "--force") {
			args.force = true;
		} else if (flag === "--dry-run") {
			args.dryRun = true;
		} else if (flag === "--smoke") {
			args.smoke = true;
		} else if (flag === "--headed") {
			args.headed = true;
		} else if (flag === "--source" || flag === "--trigger" || flag === "--time-limit-minutes") {
			const value = argv[index + 1];

			if (value === undefined || value.startsWith("--")) {
				throw new UsageError(`${flag}에 값이 필요합니다`);
			}

			index += 1;

			if (flag === "--source") {
				args.source = value;
			} else if (flag === "--trigger") {
				args.trigger = value;
			} else {
				args.timeLimitMinutes = Number(value);
			}
		} else {
			throw new UsageError(`알 수 없는 인자: ${flag}`);
		}
	}

	if (args.source !== "all" && !SOURCES.includes(args.source)) {
		throw new UsageError(`--source는 all|toss|daangn 중 하나여야 합니다`);
	}

	if (!TRIGGERS.includes(args.trigger)) {
		throw new UsageError(`--trigger는 daily|request|manual 중 하나여야 합니다`);
	}

	if (!Number.isFinite(args.timeLimitMinutes) || args.timeLimitMinutes < 1 || args.timeLimitMinutes > 300) {
		throw new UsageError("--time-limit-minutes는 1~300 사이여야 합니다");
	}

	if (args.smoke && args.source !== "daangn") {
		throw new UsageError("--smoke는 --source daangn과 함께만 씁니다");
	}

	return args;
};

/** 수집 중 만난 어떤 오류든 서버에 기록할 분류된 실패로 바꿉니다 */
export const toSourceError = (error) => {
	if (error instanceof SourceError) {
		return error;
	}

	if (error instanceof IngestError) {
		if (error.status === 0) {
			return new SourceError("network", "수집 엔드포인트에 연결하지 못했습니다", { cause: error });
		}

		if (error.status === 422 && error.code === "rejected" && /count_mismatch/.test(error.message)) {
			return new SourceError("count_mismatch", "서버가 개수 불일치로 완료를 거절했습니다", { cause: error });
		}

		if (error.status === 400 || error.status === 422) {
			return new SourceError("schema_changed", "서버가 수집 데이터를 거절했습니다", { cause: error });
		}

		return new SourceError("internal", `수집 엔드포인트 오류 (${error.status})`, { cause: error });
	}

	return new SourceError("internal", error instanceof Error ? error.message : "알 수 없는 오류", { cause: error });
};

/** 결과 목록에서 종료 코드를 정합니다. 차단만 있으면 3, 다른 실패가 하나라도 있으면 1 */
export const decideExitCode = (results) => {
	const failures = results.filter((result) => result.outcome === "failed" || result.outcome === "stale");

	if (failures.length === 0) {
		return EXIT_OK;
	}

	return failures.every((result) => result.errorCode === "blocked") ? EXIT_BLOCKED : EXIT_FAILED;
};

/** Actions 요약용 마크다운. 사유 코드만 담고 응답 본문이나 URL은 담지 않습니다 */
export const buildSummaryMarkdown = ({ results, args }) => {
	const lines = [`## 블로그 카탈로그 수집 (${args.trigger}${args.dryRun ? ", dry-run" : ""})`, "", "| 소스 | 결과 | 비고 |", "| --- | --- | --- |"];

	for (const result of results) {
		let note = "";

		if (result.outcome === "complete") {
			note = `고유 ${result.uniqueCount}개 확인, 서버 total ${result.total ?? "-"}`;
		} else if (result.outcome === "skipped") {
			note = `건너뜀: ${result.reason}`;
		} else if (result.outcome === "failed") {
			note = `실패 사유 코드 \`${result.errorCode}\` — ${result.message}. 기존 글은 유지되고 완료로 표시되지 않았습니다`;
		} else if (result.outcome === "stale") {
			note = "lease가 만료되어 쓰기가 거절됐습니다. 다음 실행이 이어받습니다";
		}

		lines.push(`| ${result.blogId} | ${result.outcome} | ${note} |`);
	}

	return lines.join("\n");
};

const SOURCE_RUNNERS = {
	toss: ({ ingest, deadline, log }) => collectToss({ ingest, deadline, log }),
	daangn: ({ ingest, deadline, log, args }) =>
		collectDaangn({ ingest, chromium: loadChromium(), deadline, log, headless: !args.headed }),
};

/** 소스 하나를 claim부터 finish/fail까지 돌립니다. 예외를 던지지 않고 결과 객체를 돌려줍니다 */
export const runBlog = async ({ blogId, client, args, deadline, log, runners = SOURCE_RUNNERS }) => {
	const claim = await client.claim({ blogId, trigger: args.trigger, force: args.force });

	if (!claim.claimed) {
		log(`${blogId}: 시작하지 않음 (${claim.reason})`);

		return { blogId, outcome: "skipped", reason: claim.reason };
	}

	const lease = { blogId, generation: claim.generation, leaseToken: claim.leaseToken };
	const ingest = {
		batch: (items) => client.batch({ ...lease, items }),
		checkpoint: (checkpoint) => client.checkpoint({ ...lease, checkpoint }),
	};

	log(`${blogId}: 시작 (세대 ${claim.generation}${claim.resume ? ", 이어서" : ""})`);

	try {
		const evidence = await runners[blogId]({ ingest, deadline, log, args });
		const finished = await client.finish({ ...lease, evidence });

		log(`${blogId}: 완료 (total ${finished.total})`);

		return { blogId, outcome: "complete", uniqueCount: evidence.uniqueCount, total: finished.total };
	} catch (error) {
		if (isStaleLeaseError(error)) {
			log(`${blogId}: lease가 만료되어 중단합니다`);

			return { blogId, outcome: "stale", errorCode: "stale_lease" };
		}

		const sourceError = toSourceError(error);
		const keepCheckpoint = sourceError.code !== "count_mismatch" && sourceError.code !== "schema_changed";

		log(`${blogId}: 실패 (${sourceError.code}) ${sourceError.message}`);

		try {
			await client.fail({ ...lease, errorCode: sourceError.code, checkpoint: sourceError.checkpoint, keepCheckpoint });
		} catch (failError) {
			log(`${blogId}: 실패 기록도 저장하지 못했습니다 (${failError instanceof Error ? failError.message : "알 수 없음"})`);
		}

		return { blogId, outcome: "failed", errorCode: sourceError.code, message: sourceError.message };
	}
};

/** --dry-run용: 서버를 부르지 않고 저장 건수만 센다. 원본 사이트 순회는 실제로 한다 */
const createDryRunClient = (log) => {
	let stored = 0;

	return {
		claim: async () => ({ claimed: true, generation: 0, leaseToken: "00000000-0000-0000-0000-000000000000", resume: false }),
		batch: async ({ items }) => {
			stored += items.length;
		},
		checkpoint: async () => {},
		finish: async ({ evidence }) => {
			log(`DRY RUN: 저장 대상 ${stored}건, 완료 증거 ${JSON.stringify(evidence)}`);

			return { total: evidence.uniqueCount };
		},
		fail: async ({ errorCode }) => {
			log(`DRY RUN: 실패 기록 생략 (${errorCode})`);
		},
	};
};

const writeSummary = (markdown) => {
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
	}
};

const runSmoke = async ({ args, log }) => {
	try {
		const outcome = await smokeDaangn({ chromium: loadChromium(), log, headless: !args.headed });

		log(`당근 smoke 통과: ${JSON.stringify(outcome)}`);
		writeSummary(`## 당근 CI smoke\n\n통과 — HTTP ${outcome.httpStatus}, 초기 글 ${outcome.initialArticles}개, GraphQL 응답 ${outcome.graphqlResponses}회, 고유 ${outcome.uniqueArticles}개`);

		return EXIT_OK;
	} catch (error) {
		const sourceError = toSourceError(error);

		log(`당근 smoke 실패 (${sourceError.code}): ${sourceError.message}`);
		writeSummary(`## 당근 CI smoke\n\n실패 — 사유 코드 \`${sourceError.code}\`: ${sourceError.message}\n\n차단(blocked)이면 이 실행 환경에서는 당근을 전체 수집할 수 없습니다. 우회하지 않습니다.`);

		return sourceError.code === "blocked" ? EXIT_BLOCKED : EXIT_FAILED;
	}
};

const main = async () => {
	const log = (message) => console.log(message);
	let args;

	try {
		args = parseArgs(process.argv.slice(2));
	} catch (error) {
		console.error(`사용법 오류: ${error.message}`);

		return EXIT_USAGE;
	}

	if (args.smoke) {
		return await runSmoke({ args, log });
	}

	const secret = process.env.BLOG_CATALOG_INGEST_SECRET;

	if (!args.dryRun && !secret) {
		console.error("BLOG_CATALOG_INGEST_SECRET이 설정되지 않았습니다");

		return EXIT_USAGE;
	}

	const client = args.dryRun
		? createDryRunClient(log)
		: createIngestClient({ url: process.env.BLOG_CATALOG_INGEST_URL || DEFAULT_INGEST_URL, secret });
	const deadline = Date.now() + args.timeLimitMinutes * 60_000;
	const blogIds = args.source === "all" ? SOURCES : [args.source];
	const results = [];

	for (const blogId of blogIds) {
		try {
			results.push(await runBlog({ blogId, client, args, deadline, log }));
		} catch (error) {
			// claim 자체가 실패한 경우(엔드포인트 장애·인증 실패). 기록할 lease가 없으므로 결과에만 남깁니다.
			const sourceError = toSourceError(error);

			log(`${blogId}: claim 실패 (${sourceError.code}) ${sourceError.message}`);
			results.push({ blogId, outcome: "failed", errorCode: sourceError.code, message: sourceError.message });
		}
	}

	writeSummary(buildSummaryMarkdown({ results, args }));

	return decideExitCode(results);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	process.exitCode = await main();
}
