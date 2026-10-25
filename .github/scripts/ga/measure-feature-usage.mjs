#!/usr/bin/env node
/**
 * 임의 기간의 기능별 사용량을 GA4 에서 조회해 터미널에 표로 냅니다.
 *
 * 주간 리포트(report-weekly-ga.mjs)는 지난주를 Slack 에 게시하지만, 이 스크립트는
 * 기간을 손으로 정해 바로 묻습니다. 기능마다 사용자 수, 이벤트 수, 사용자당 횟수,
 * 활성 사용자 대비 도입률, 직전 같은 길이 기간 대비 증감을 냅니다.
 *
 * 사용법:
 *   GA4_PROPERTY_ID=471860782 \
 *   GA4_SERVICE_ACCOUNT_JSON="$(cat ~/ga4-service-account.json)" \
 *   node .github/scripts/ga/measure-feature-usage.mjs [--from YYYY-MM-DD --to YYYY-MM-DD] [--format table|csv|json]
 *
 * --from/--to 를 생략하면 서울 기준 지난주(월~일)입니다. 둘은 함께 주어야 합니다.
 * 이벤트 목록은 packages/shared 의 type.ts 에서 읽고, 모수는 주간 리포트와 같은
 * 호스트 허용 목록(운영 웹 + 확장)입니다.
 */

import { parseArgs } from "node:util";
import {
	fetchFeatureUsage,
	formatUsageCsv,
	formatUsageJson,
	formatUsageTable,
} from "./ga4-usage.mjs";
import { resolveTargetWeek } from "./ga4-weekly.mjs";
import { requireEnv } from "../shared/run-context.mjs";

const FORMATTERS = {
	table: formatUsageTable,
	csv: formatUsageCsv,
	json: formatUsageJson,
};

const USAGE = `사용법: node .github/scripts/ga/measure-feature-usage.mjs [옵션]

  --from YYYY-MM-DD   시작일 (기본: 지난주 월요일, 서울 기준)
  --to   YYYY-MM-DD   종료일 (기본: 지난주 일요일). --from 과 함께 줍니다
  --format table|csv|json   출력 형식 (기본: table)
  -h, --help          이 도움말

환경 변수: GA4_PROPERTY_ID, GA4_SERVICE_ACCOUNT_JSON`;

const main = async () => {
	const { values } = parseArgs({
		options: {
			from: { type: "string" },
			to: { type: "string" },
			format: { type: "string", default: "table" },
			help: { type: "boolean", short: "h", default: false },
		},
	});

	if (values.help) {
		console.log(USAGE);

		return;
	}

	const format = FORMATTERS[values.format];

	if (!format) {
		throw new Error(
			`--format 은 table, csv, json 중 하나여야 합니다: ${values.format}`,
		);
	}

	if (Boolean(values.from) !== Boolean(values.to)) {
		throw new Error("--from 과 --to 는 함께 주어야 합니다");
	}

	const week = resolveTargetWeek();
	const period = values.from
		? { start: values.from, end: values.to }
		: { start: week.start, end: week.end };

	const report = await fetchFeatureUsage({
		serviceAccountJson: requireEnv("GA4_SERVICE_ACCOUNT_JSON"),
		propertyId: requireEnv("GA4_PROPERTY_ID"),
		period,
	});

	console.log(format(report));
};

try {
	await main();
} catch (error) {
	// 사용법 오류에 스택을 붙이면 무엇이 틀렸는지가 묻힙니다. 메시지만 냅니다.
	console.error(`오류: ${error.message}`);
	process.exitCode = 1;
}
