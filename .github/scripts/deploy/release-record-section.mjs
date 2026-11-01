/**
 * 릴리스 결과 Slack 메시지에 붙일 "배포 기록" 섹션을 만듭니다.
 * record-deploy.mjs가 남긴 결과 JSON을 읽어, notify-release-result.mjs가 블록으로 끼웁니다.
 */

import { existsSync, readFileSync } from "node:fs";

const MAX_PR_LINES = 10;
const MAX_TITLE_LENGTH = 120;

/** Slack mrkdwn에서 의미를 갖는 세 글자만 이스케이프합니다. */
const escapeMrkdwn = (text) =>
	text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const truncate = (text) =>
	text.length > MAX_TITLE_LENGTH ? `${text.slice(0, MAX_TITLE_LENGTH)}…` : text;

/**
 * 결과 JSON을 읽습니다. 파일이 없거나 깨졌거나 다른 타깃의 것이면 null입니다 —
 * 기록은 부가 정보라, 못 읽었다고 알림 자체를 막지 않고 기존 메시지 그대로 나갑니다.
 */
export const readRecordResult = ({ path, target }) => {
	if (!path || !existsSync(path)) {
		return null;
	}

	try {
		const record = JSON.parse(readFileSync(path, "utf8"));

		return record && record.target === target ? record : null;
	} catch (error) {
		console.warn(
			`::warning::배포 기록 결과를 읽지 못했습니다: ${error.message}`,
		);

		return null;
	}
};

/** 기록이 성공했고 PR 목록이 없을 때 PR 섹션 대신 보여줄 한 줄. */
const describeKind = (record) => {
	switch (record.kind) {
		case "first":
			return "기록 시작";
		case "rollback":
			return `롤백 → ${(record.refSha ?? "").slice(0, 7)}`;
		case "diverged":
			return "master 외 ref 배포";
		default:
			return "변경된 PR 없음";
	}
};

/**
 * 섹션 본문(mrkdwn). 기록 파일 링크는 기록 성공·실패와 무관하게 항상 붙습니다.
 *
 * @param {{ ok: boolean, kind?: string, refSha?: string, prs?: Array<{ number: number, title: string, url: string }>, recordUrl: string }} record
 * @returns {string}
 */
export const buildRecordSectionText = (record) => {
	const link = `<${record.recordUrl}|배포 기록 보기>`;

	if (!record.ok) {
		return ["기록 실패", link].join("\n");
	}

	const prs = record.prs ?? [];

	if (record.kind === "forward" && prs.length > 0) {
		const shown = prs
			.slice(0, MAX_PR_LINES)
			.map(
				(pr) => `<${pr.url}|#${pr.number}> ${escapeMrkdwn(truncate(pr.title))}`,
			);
		const rest = prs.length - shown.length;

		return [
			`*이번 배포에 들어간 PR ${prs.length}건*`,
			...shown,
			...(rest > 0 ? [`외 ${rest}건`] : []),
			link,
		].join("\n");
	}

	return [describeKind(record), link].join("\n");
};

/** Slack 블록 하나. 결과 JSON이 없으면 null(= 기존 메시지 그대로). */
export const buildRecordBlock = (record) =>
	record
		? {
				type: "section",
				text: { type: "mrkdwn", text: buildRecordSectionText(record) },
			}
		: null;
