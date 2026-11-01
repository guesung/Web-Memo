#!/usr/bin/env node
/**
 * publish 잡이 쓸 PR 제목·커밋 메시지·본문을 .sentry-triage/ 에 만듭니다.
 * AI 가 쓴 문자열은 비신뢰 데이터라 멘션(@)·HTML 을 무력화하고 길이를 제한합니다.
 *
 * 산출물: pr-title.txt (한 줄, 커밋 제목 겸용), pr-body.md
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { normalizeAnalysis } from "./report-sentry-triage.mjs";
import { isMainModule, readRawInputs, validateInputs } from "./triage-inputs.mjs";

const DIR = ".sentry-triage";

/** 마크다운에서 알림·HTML·줄 구조를 만들 수 있는 문자를 막습니다. */
export const escapeMarkdown = (value, max = 500) => {
	const text = String(value ?? "")
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
		.replace(/@/g, "@​")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\r?\n/g, " ")
		.trim();

	return text.length > max ? `${text.slice(0, max)}…` : text;
};

export const buildPrTitle = ({ shortId, analysis }) => {
	const summary = escapeMarkdown(analysis?.fixSummary, 50).replace(/[`#]/g, "");

	return `fix: Sentry ${shortId} ${summary || "오류 수정"}`.trim();
};

const verifyLabel = (value) =>
	({ success: "통과", failure: "실패", skipped: "건너뜀" })[value] ?? "알 수 없음";

export const buildPrBody = ({ inputs, analysis, patchCheck, verify, runUrl }) => {
	const sentryUrl = `https://guesung.sentry.io/issues/${inputs.issueId}/`;
	const evidence = (analysis?.evidence ?? [])
		.map((item) => `- ${escapeMarkdown(item, 300)}`)
		.join("\n");

	return `## 설명

> **AI가 자동 생성한 PR입니다.** 자동 머지·배포·Sentry resolve 를 하지 않습니다. 사람이 리뷰하고 직접 머지해야 합니다.

Sentry ${inputs.shortId} (${inputs.projectSlug}, ${inputs.action === "created" ? "새 이슈" : "재발"})에 대한 AI 분석과 최소 수정입니다.

- 수정: ${escapeMarkdown(analysis?.fixSummary, 600) || "(기재 없음)"}
- 가설: ${escapeMarkdown(analysis?.hypothesis, 800) || "(기재 없음)"}
- 확신도: ${analysis?.confidence ?? "low"}
- 불확실성: ${escapeMarkdown(analysis?.uncertainty, 600) || "(기재 없음)"}

### 근거

${evidence || "- (기재 없음)"}

### 검증 결과

- \`pnpm check\`: ${verifyLabel(verify?.check)}
- \`pnpm type-check\`: ${verifyLabel(verify?.typeCheck)}
- \`pnpm test:jest\`: ${verifyLabel(verify?.test)}
- 변경: ${(patchCheck?.files ?? []).length}개 파일, ${patchCheck?.changedLines ?? 0}줄
- 추가한 테스트: ${(analysis?.testsAdded ?? []).map((item) => escapeMarkdown(item, 150)).join(", ") || "없음"}
- 이벤트는 대표 이벤트 기준이라 알림을 유발한 이벤트와 다를 수 있습니다.

## 관련 이슈

- Sentry: ${sentryUrl}
${runUrl ? `- Actions 실행: ${runUrl}` : ""}

## 변경 유형

- 버그 수정 (AI 자동 생성)

## 체크리스트

- [x] 금지 경로(.github, migrations, 인증·결제, 의존성·환경 파일) 변경 없음, 5개 파일·200줄 이하 (자동 검사)
- [ ] 리뷰어가 가설과 근거(file:line)를 직접 확인
- [ ] 리뷰어가 수정이 증상 가리기가 아니라 원인 수정인지 확인
- [ ] 머지·배포 후 Sentry ${inputs.shortId} 재발 여부 확인
`;
};

const readJson = (name) => {
	const path = `${DIR}/${name}`;

	return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
};

const main = () => {
	const parsed = validateInputs(readRawInputs());
	if (!parsed.ok) throw new Error(`입력 검증 실패: ${parsed.errors.join("; ")}`);

	const analysis = normalizeAnalysis(readJson("analysis.json"));
	const runUrl = `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

	writeFileSync(`${DIR}/pr-title.txt`, `${buildPrTitle({ shortId: parsed.value.shortId, analysis })}\n`);
	writeFileSync(
		`${DIR}/pr-body.md`,
		buildPrBody({
			inputs: parsed.value,
			analysis,
			patchCheck: readJson("patch-check.json"),
			verify: readJson("verify.json"),
			runUrl,
		}),
	);
};

if (isMainModule(import.meta.url)) {
	try {
		main();
	} catch (error) {
		console.error(`::error::${error instanceof Error ? error.message : error}`);
		process.exit(1);
	}
}
