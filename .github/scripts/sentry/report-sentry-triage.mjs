#!/usr/bin/env node
/**
 * Sentry 알림 Slack 스레드에 AI 분석 결과를 답글로 답니다.
 * chore-sentry-triage.yml 의 guard(skip)·publish(result)·notify-failure(failure)가 호출합니다.
 *
 * TRIAGE_MODE
 *   result  분석 결과 (.sentry-triage/*.json 을 읽음. PR_URL 이 있으면 PR 링크)
 *   skip    건너뜀 사유 한 줄 (SKIP_REASON)
 *   failure AI 분석 실패 안내
 *
 * 알림 실패는 잡의 결론을 바꾸지 않습니다(slack-api.mjs 가 던지지 않습니다).
 * SLACK_TS 가 비어 있으면 스레드를 달 곳이 없어 경고만 남기고 건너뜁니다.
 * DRY_RUN=true 면 보낼 내용을 로그로만 찍습니다.
 */

import { existsSync, readFileSync } from "node:fs";
import { postSlackMessage, toSingleLine } from "../shared/slack-api.mjs";
import { isMainModule, readRawInputs, validateInputs } from "./triage-inputs.mjs";

const DIR = ".sentry-triage";
const MAX_FIELD = 400;
const MAX_MESSAGE = 2800;

/** Slack mrkdwn 에서 멘션·링크로 해석될 수 있는 문자를 막고 길이를 제한합니다. */
export const escapeSlack = (value, max = MAX_FIELD) => {
	const text = String(value ?? "")
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/[`*_~]/g, "'")
		.replace(/\s+/g, " ")
		.trim();

	return text.length > max ? `${text.slice(0, max)}…` : text;
};

const CONFIDENCE_LABEL = { high: "높음", medium: "보통", low: "낮음" };

/** AI 출력은 스키마를 어길 수 있어 필요한 필드만 안전하게 꺼냅니다. */
export const normalizeAnalysis = (raw) => {
	let data = raw;
	if (typeof raw === "string") {
		try {
			data = JSON.parse(raw);
		} catch {
			data = null;
		}
	}
	if (!data || typeof data !== "object") return null;

	const list = (value) => (Array.isArray(value) ? value.map(String) : []);

	return {
		summary: String(data.summary ?? ""),
		hypothesis: String(data.hypothesis ?? ""),
		evidence: list(data.evidence),
		uncertainty: String(data.uncertainty ?? ""),
		confidence: ["high", "medium", "low"].includes(data.confidence) ? data.confidence : "low",
		fixApplied: data.fix_applied === true,
		fixSummary: String(data.fix_summary ?? ""),
		testsAdded: list(data.tests_added),
	};
};

const verifyLine = (verify) => {
	if (!verify) return "검증: 실행하지 않음";
	const label = { success: "통과", failure: "실패", skipped: "건너뜀" };
	const part = (name, value) => `${name} ${label[value] ?? "알 수 없음"}`;

	return `검증: ${part("check", verify.check)} · ${part("type-check", verify.typeCheck)} · ${part("test", verify.test)}`;
};

/**
 * 수정 여부 한 줄. 우선순위: PR 생성 > 패치 거부 > 검증 실패 > PR 실패 > 미수정.
 */
export const describeFix = ({ analysis, patchCheck, verify, prUrl }) => {
	if (prUrl) return `수정: PR 생성 <${prUrl}|PR 열기> (사람 리뷰 필수)`;
	if (patchCheck?.status === "rejected") {
		return `수정: 패치 거부 — ${escapeSlack((patchCheck.reasons ?? []).slice(0, 3).join("; "))}`;
	}
	if (patchCheck?.status === "ready") {
		if (!verify) return "수정: 패치는 통과했지만 검증을 실행하지 못해 PR 을 만들지 않았습니다";
		if (verify.status !== "passed") {
			return "수정: 패치는 만들었지만 적용·검증에 실패해 PR 을 만들지 않았습니다";
		}

		return "수정: 패치는 통과했지만 PR 생성에 실패했습니다(실행 로그 확인)";
	}

	return `수정 없음${analysis?.fixSummary ? ` — ${escapeSlack(analysis.fixSummary)}` : analysis?.uncertainty ? ` — ${escapeSlack(analysis.uncertainty)}` : ""}`;
};

export const buildResultText = ({ shortId, analysis, patchCheck, verify, prUrl, runUrl }) => {
	const head = `:robot_face: *AI 분석 — ${escapeSlack(shortId, 64)}*`;
	if (!analysis) {
		return [head, "분석 결과를 읽지 못했습니다. 실행 로그를 확인하세요.", `<${runUrl}|실행 로그>`]
			.filter(Boolean)
			.join("\n");
	}

	const evidence = analysis.evidence.slice(0, 3).map((item) => `• ${escapeSlack(item, 200)}`);
	const lines = [
		head,
		`*가설*: ${escapeSlack(analysis.hypothesis)}`,
		evidence.length > 0 ? `*근거*\n${evidence.join("\n")}` : "*근거*: 없음",
		`*불확실성*: ${escapeSlack(analysis.uncertainty) || "기재 없음"}`,
		`*확신도*: ${CONFIDENCE_LABEL[analysis.confidence]}`,
		describeFix({ analysis, patchCheck, verify, prUrl }),
		verifyLine(verify),
		runUrl ? `<${runUrl}|Actions 실행 링크>` : "",
	];

	return lines.filter(Boolean).join("\n").slice(0, MAX_MESSAGE);
};

export const buildSkipText = ({ shortId, reason }) =>
	`:fast_forward: *AI 분석 건너뜀 — ${escapeSlack(shortId, 64)}*\n${escapeSlack(reason)}`;

export const buildFailureText = ({ shortId, runUrl }) =>
	`:warning: *AI 분석 실패 — ${escapeSlack(shortId, 64)}*\n원본 알림은 유지됩니다.${runUrl ? ` <${runUrl}|실행 로그>` : ""}`;

export const toPayload = (text) => ({
	text: text.split("\n")[0],
	blocks: [{ type: "section", text: { type: "mrkdwn", text } }],
});

const readJson = (name) => {
	const path = `${DIR}/${name}`;
	if (!existsSync(path)) return null;
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return null;
	}
};

const main = async () => {
	const mode = process.env.TRIAGE_MODE;
	const parsed = validateInputs(readRawInputs());
	const inputs = parsed.ok ? parsed.value : null;
	const shortId = inputs?.shortId ?? process.env.SHORT_ID ?? "";
	const runUrl =
		process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
			? `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
			: "";

	let text;
	if (mode === "skip") {
		text = buildSkipText({ shortId, reason: process.env.SKIP_REASON ?? "" });
	} else if (mode === "failure") {
		text = buildFailureText({ shortId, runUrl });
	} else if (mode === "result") {
		text = buildResultText({
			shortId,
			analysis: normalizeAnalysis(readJson("analysis.json")),
			patchCheck: readJson("patch-check.json"),
			verify: readJson("verify.json"),
			prUrl: process.env.PR_URL || "",
			runUrl,
		});
	} else {
		throw new Error(`TRIAGE_MODE 는 result|skip|failure 중 하나여야 합니다: ${mode}`);
	}

	const payload = toPayload(text);
	const token = process.env.SLACK_BOT_TOKEN;
	const channel = inputs?.slackChannel;
	const threadTs = inputs?.slackTs;

	if (process.env.DRY_RUN === "true" || !token || !channel || !threadTs) {
		if (process.env.DRY_RUN !== "true") {
			console.warn(
				`::warning::${toSingleLine("SLACK_BOT_TOKEN·slack_channel·slack_ts 중 비어 있는 것이 있어 스레드 답글을 건너뜁니다")}`,
			);
		}
		console.log(text);

		return;
	}

	const result = await postSlackMessage({ token, channel, payload, threadTs });
	if (!result.ok) {
		console.warn(`::warning::${toSingleLine(`Slack 스레드 답글 실패: ${result.error}`)}`);
	}
};

if (isMainModule(import.meta.url)) {
	main().catch((error) => {
		// 알림 실패가 잡 결론을 바꾸지 않습니다.
		console.warn(`::warning::${toSingleLine(`Slack 보고 실패: ${error instanceof Error ? error.message : error}`)}`);
	});
}
