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

/** stdout·GitHub summary·Slack에 공통으로 사용하는 비밀 없는 요약입니다. */
export const formatAuditReport = (result) => [
	`Supabase 운영 감사: 오류 ${result.errorCount}개, 경고 ${result.warningCount}개`,
	`프로젝트: ${result.projectRef ?? "확인 불가"} / 검사: ${result.checkedAt}`,
	...result.findings.map((finding) => `- [${finding.severity}] ${finding.message}`),
].join("\n");

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
