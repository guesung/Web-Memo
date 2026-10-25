#!/usr/bin/env node
/**
 * 주간 리팩토링 점검 결과로 노션 작업 카드를 만들고 Slack에 알립니다.
 * .github/workflows/audit-refactor.yml 이 claude-code-action 다음 단계로 호출합니다.
 *
 * 점검 자체는 앞 단계가 읽기 전용으로 끝냈고, 여기서는 그 JSON(AUDIT_RESULT)만 받습니다.
 * LLM 토큰을 쓰지 않는 결정적인 전달 단계입니다.
 *
 * 카드를 만들지 않고 Slack에만 알리는 경우가 둘 있습니다. 할 일 없는 카드나 손대지 않은 같은
 * 카드가 매주 쌓이면 진짜 카드가 묻히기 때문입니다.
 *   - 발견이 하나도 없을 때
 *   - 앞 회차에 만든 점검 카드가 아직 열려 있을 때
 *
 * 로컬 실행 (NOTION_TOKEN 없이 돌리면 보낼 내용을 stdout에 찍고 아무것도 보내지 않습니다):
 *   AUDIT_RESULT='{"summary":"요약","findings":[{"title":"제목","severity":"high","category":"design","files":["a.ts:1"],"problem":"문제","suggestion":"제안"}]}' \
 *   NOTION_WORK_LOG_DATABASE_ID=5f408e05-0015-4532-bcd8-bd36439bec5a \
 *   node .github/scripts/refactor/report-refactor-audit.mjs
 */

import {
	buildNotionPage,
	buildSlackPayload,
	createNotionCard,
	findOpenAuditCard,
	normalizeAudit,
} from "./refactor-audit.mjs";
import { requireEnv } from "../shared/run-context.mjs";
import { postToSlack } from "../shared/slack-blocks.mjs";

/** 서울 기준 오늘(YYYY-MM-DD). 러너 시간대(UTC)로 찍으면 토요일 10시 실행도 같은 날이라 어긋나지 않지만, 지연 실행에 대비합니다. */
const readSeoulDate = () =>
	new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());

const main = async () => {
	const audit = normalizeAudit(requireEnv("AUDIT_RESULT"));
	const repository = process.env.GITHUB_REPOSITORY;
	const runId = process.env.GITHUB_RUN_ID;
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
	const runUrl =
		repository && runId ? `${serverUrl}/${repository}/actions/runs/${runId}` : null;

	const databaseId = requireEnv("NOTION_WORK_LOG_DATABASE_ID");
	const page = buildNotionPage({
		databaseId,
		audit,
		dateLabel: readSeoulDate(),
		runUrl,
	});

	if (!process.env.NOTION_TOKEN) {
		console.warn("::warning::NOTION_TOKEN 이 없어 노션 카드 생성을 건너뜁니다");
		console.log(JSON.stringify(page, null, 2));
		console.log(JSON.stringify(buildSlackPayload({ audit, cardUrl: null, runUrl }), null, 2));

		return;
	}

	const token = process.env.NOTION_TOKEN;
	const hasFindings = audit.findings.length > 0;
	const openCardUrl = hasFindings ? await findOpenAuditCard({ token, databaseId }) : null;
	const cardUrl =
		hasFindings && !openCardUrl ? await createNotionCard({ token, page }) : null;
	const payload = buildSlackPayload({ audit, cardUrl, openCardUrl, runUrl });

	if (!process.env.SLACK_REPORT_WEBHOOK_URL) {
		console.warn("::warning::SLACK_REPORT_WEBHOOK_URL 이 없어 Slack 전송을 건너뜁니다");
		console.log(JSON.stringify(payload, null, 2));

		return;
	}

	await postToSlack(process.env.SLACK_REPORT_WEBHOOK_URL, payload);
};

await main();
