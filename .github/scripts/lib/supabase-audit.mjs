import { collectSupabaseState } from "./supabase-audit-api.mjs";

/** 선언을 검사하고 읽기 전용 감사 결과를 생성합니다. error가 있으면 exitCode는 1입니다. */
export const auditSupabase = async ({ manifest, token, now = new Date(), fetcher = fetch }) => {
	const findings = [];
	let observations = {};
	try {
		validateManifest(manifest);
	} catch {
		findings.push({ severity: "error", category: "manifest", code: "invalid_manifest", message: "운영 상태 선언 파일의 형식이 올바르지 않습니다" });
	}
	if (!token) {
		findings.push({ severity: "error", category: "authentication", code: "missing_token", message: "SUPABASE_ACCESS_TOKEN이 없어 감사할 수 없습니다" });
	}
	if (findings.length === 0) {
		const state = await collectSupabaseState({ manifest, token, now, fetcher });
		observations = state.observations;
		findings.push(...state.failures, ...compareSupabaseState({ manifest, observations }));
	}
	const errorCount = findings.filter(({ severity }) => severity === "error").length;
	const warningCount = findings.filter(({ severity }) => severity === "warning").length;
	const result = { projectRef: manifest?.projectRef ?? null, checkedAt: now.toISOString(), findings, observations, errorCount, warningCount, exitCode: errorCount > 0 ? 1 : 0 };

	return { ...result, slackMessage: formatAuditReport(result) };
};

/** 관측 실패는 missing으로 바꾸지 않고 성공한 조회 결과만 비교합니다. */
export const compareSupabaseState = ({ manifest, observations }) => {
	const findings = [];
	const add = (finding) => findings.push(finding);
	if (observations.project) {
		if (observations.project.status !== "ACTIVE_HEALTHY") {
			add({ severity: "error", category: "project", code: "unhealthy", message: "프로젝트가 ACTIVE_HEALTHY 상태가 아닙니다" });
		}
		const version = observations.project.postgresVersion;
		if (typeof version !== "string" || !/^\d+\./.test(version)) {
			add({ severity: "error", category: "project", code: "invalid_response", message: "PostgreSQL 버전을 조회하지 못했습니다" });
		} else if (Number(version.split(".")[0]) !== manifest.postgresMajor) {
			add({ severity: "warning", category: "project", code: "version_drift", message: `PostgreSQL major: 기대 ${manifest.postgresMajor}, 관측 ${version}` });
		}
	}
	for (const category of ["services", "migrations", "functions", "secrets", "cron", "triggers", "webhooks", "vault"]) {
		const actual = observations[category];
		if (!actual) {
			continue;
		}
		if (!Array.isArray(actual) || actual.some((item) => typeof item.name !== "string" || !item.name)) {
			add({ severity: "error", category, code: "invalid_response", message: `${category}: 식별자가 없는 응답입니다` });
			continue;
		}
		const expected = manifest[category].map((item) => typeof item === "string" ? { name: item } : item);
		for (const entry of expected) {
			const found = actual.find(({ name }) => name === entry.name);
			if (!found) {
				add({ severity: "error", category, code: "missing", message: `${category}: 필수 ${entry.name} 누락` });
				continue;
			}
			if (category === "functions" && entry.version !== null && found.version !== entry.version) {
				add({ severity: "warning", category, code: "version_drift", message: `${entry.name}: 기대 배포 ${entry.version}, 관측 ${found.version}` });
			}
		}
		for (const entry of actual) {
			if (!expected.some(({ name }) => name === entry.name)) {
				add({ severity: "warning", category, code: "extra", message: `${category}: 미선언 ${entry.name}` });
			}
			if ((category === "functions" && entry.status !== "ACTIVE") || (category === "services" && entry.status !== "ACTIVE_HEALTHY") || (["cron", "triggers", "webhooks"].includes(category) && entry.active !== true)) {
				add({ severity: "error", category, code: "unhealthy", message: `${category}: ${entry.name} 비정상 또는 비활성 상태` });
			}
			if (category === "functions" && (!Number.isSafeInteger(entry.version) || entry.version < 1)) {
				add({ severity: "error", category, code: "invalid_response", message: `${entry.name}: 배포 버전을 확인하지 못했습니다` });
			}
		}
	}
	for (const category of ["functionHttpErrors", "functionLogErrors"]) {
		if (observations[category]?.count > 0) {
			add({ severity: "error", category, code: "function_errors", message: `${category}: 최근 24시간 오류 ${observations[category].count}건` });
		}
	}
	add({ severity: "warning", category: "runtime", code: "unobservable", message: "정확한 Edge Runtime/Deno 버전은 공식 API로 관측할 수 없습니다. 배포 버전과 프로젝트 서비스 상태를 검사합니다" });
	for (const note of manifest.baselineNotes) {
		add({ severity: "warning", category: "baseline", code: "baseline_note", message: note });
	}

	return findings;
};

/** Slack 이상 알림에 사용하는 비밀 없는 요약입니다. */
export const formatAuditReport = (result) => [
	`Supabase 운영 감사: 오류 ${result.errorCount}개, 경고 ${result.warningCount}개`,
	`프로젝트: ${result.projectRef ?? "확인 불가"} / 검사: ${result.checkedAt}`,
	...result.findings.map((finding) => `- [${finding.severity}] ${finding.message}`),
].join("\n");

/** 정상 리소스까지 포함한 운영 인벤토리와 감사 결과를 GitHub Summary에 표시합니다. */
export const formatAuditSummary = (result) => {
	const observations = result.observations ?? {};
	const sections = [
		"## Supabase 운영 현황",
		`프로젝트: ${formatSummaryCell(result.projectRef)} / 검사: ${formatSummaryCell(result.checkedAt)}`,
		`프로젝트 상태: ${formatSummaryCell(observations.project?.status)} / PostgreSQL: ${formatSummaryCell(observations.project?.postgresVersion)}`,
		formatInventoryTable({ title: "DB 및 서비스 상태", entries: observations.services, columns: [["서비스", "name"], ["상태", "status"]] }),
		formatInventoryTable({ title: "배포된 Edge Functions", entries: observations.functions, columns: [["함수", "name"], ["배포 버전", "version"], ["상태", "status"]] }),
		"### 최근 24시간 Edge Function 오류",
		"HTTP 오류는 응답 상태 코드 400 이상이며, 로그 오류는 error 수준 또는 UncaughtException 이벤트입니다. 두 집계에는 같은 요청이 포함될 수 있습니다.",
		"| 구분 | 오류 수 | 조회 시작 (UTC) | 조회 종료 (UTC) |",
		"| --- | --- | --- | --- |",
	];
	for (const [category, label] of [["functionHttpErrors", "HTTP 오류"], ["functionLogErrors", "로그 오류"]]) {
		const observation = observations[category];
		sections.push(`| ${label} | ${formatSummaryCell(observation?.count)} | ${formatSummaryCell(observation?.start)} | ${formatSummaryCell(observation?.end)} |`);
	}
	for (const [category, title] of [["migrations", "적용된 마이그레이션"], ["cron", "Cron 작업"], ["triggers", "DB 트리거"], ["webhooks", "DB Webhook"], ["vault", "Vault 키 이름"], ["secrets", "Edge Function 시크릿 이름"]]) {
		const columns = [["이름", "name"]];
		if (["cron", "triggers", "webhooks"].includes(category)) {
			columns.push(["활성 여부", "active"]);
		}
		sections.push(formatInventoryTable({ title, entries: observations[category], columns }));
	}
	sections.push("### 감사 결과", `오류 ${result.errorCount}개, 경고 ${result.warningCount}개`);
	sections.push(...result.findings.map((finding) => `- [${formatSummaryCell(finding.severity)}] ${formatSummaryCell(finding.message)}`));

	return sections.join("\n\n").replaceAll("|\n\n|", "|\n|");
};

/** 표는 허용된 메타데이터 필드만 출력하며, 관측 실패를 빈 인벤토리와 구분합니다. */
const formatInventoryTable = ({ title, entries, columns }) => {
	if (!Array.isArray(entries)) {
		return `### ${title}\n\n조회하지 못했습니다. 감사 결과에서 실패 원인을 확인하세요.`;
	}
	if (entries.length === 0) {
		return `### ${title} (0개)\n\n조회된 리소스가 없습니다.`;
	}
	const rows = entries.map((entry) => `| ${columns.map(([, field]) => formatSummaryCell(entry[field])).join(" | ")} |`);

	return [`### ${title} (${entries.length}개)`, "", `| ${columns.map(([label]) => label).join(" | ")} |`, `| ${columns.map(() => "---").join(" | ")} |`, ...rows].join("\n");
};

/** 리소스 이름의 Markdown·HTML·줄바꿈이 표 구조나 링크로 해석되지 않도록 처리합니다. */
const formatSummaryCell = (value) => {
	if (value === undefined || value === null || value === "") {
		return "확인 불가";
	}
	if (typeof value === "boolean") {
		return value ? "활성" : "비활성";
	}

	return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replace(/[\\`*_[\]{}()#!|~]/g, (character) => `&#${character.charCodeAt(0)};`).replace(/[\r\n\t]/g, " ");
};

/** Actions annotation 명령 삽입을 막기 위해 제어 문자를 이스케이프합니다. */
export const formatAuditAnnotation = (finding) => {
	const message = finding.message.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");

	return `::${finding.severity}::${message}`;
};

/** 잘못된 선언으로 감사를 조용히 생략하지 않도록 필수 배열을 확인합니다. */
const validateManifest = (manifest) => {
	if (manifest?.schemaVersion !== 1 || !/^[a-z]{20}$/.test(manifest.projectRef) || !Number.isInteger(manifest.postgresMajor) || manifest.postgresMajor < 1) {
		throw new Error("Invalid manifest");
	}
	for (const category of ["services", "migrations", "secrets", "cron", "triggers", "webhooks", "vault", "baselineNotes"]) {
		if (!Array.isArray(manifest[category]) || manifest[category].some((item) => typeof item !== "string" || !item)) {
			throw new Error("Invalid resource list");
		}
	}
	if (!manifest.services.includes("db") || manifest.services.some((service) => !["auth", "db", "db_postgres_user", "pooler", "realtime", "rest", "storage", "pg_bouncer"].includes(service))) {
		throw new Error("Invalid services");
	}
	if (!Array.isArray(manifest.functions) || manifest.functions.some((entry) => !entry || typeof entry.name !== "string" || !entry.name || (entry.version !== null && (!Number.isInteger(entry.version) || entry.version < 1)))) {
		throw new Error("Invalid functions");
	}
};
