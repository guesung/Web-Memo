import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { auditSupabase, compareSupabaseState, formatAuditAnnotation, formatAuditSummary } from "./supabase-audit.mjs";

const MANIFEST = {
	schemaVersion: 1,
	projectRef: "czwtqukymcqoberdoltq",
	postgresMajor: 15,
	services: ["db"],
	migrations: ["20260912"],
	schemaObjects: ["table:memo.highlight", "column:memo.memo.deleted_at", "function:memo.get_admin_stats(boolean)"],
	functions: [{ name: "send-welcome-email", version: 2 }],
	secrets: ["CRON_SECRET"],
	cron: ["daily-article-reminder"],
	triggers: ["auth.users.send_welcome_email_trigger"],
	webhooks: [],
	vault: ["cron_secret"],
	baselineNotes: [],
};

const getObservations = () => ({
	project: { status: "ACTIVE_HEALTHY", postgresVersion: "15.8.1.060" },
	services: [{ name: "db", status: "ACTIVE_HEALTHY" }],
	migrations: [{ name: "20260912" }],
	schemaObjects: MANIFEST.schemaObjects.map((name) => ({ name })),
	functions: [{ name: "send-welcome-email", status: "ACTIVE", version: 2 }],
	secrets: [{ name: "CRON_SECRET" }],
	cron: [{ name: "daily-article-reminder", active: true }],
	triggers: [{ name: "auth.users.send_welcome_email_trigger", active: true }],
	webhooks: [],
	vault: [{ name: "cron_secret" }],
	functionHttpErrors: { count: 0 },
	functionLogErrors: { count: 0 },
});

const createFetcher = (override?: (url: URL, query: string) => Response | undefined) => vi.fn(async (input: string, options: RequestInit) => {
	const url = new URL(input);
	const query = options.body ? JSON.parse(String(options.body)).query : "";
	const overridden = override?.(url, query);
	if (overridden) {
		return overridden;
	}
	let body: unknown;
	if (url.pathname.endsWith("/health")) {
		body = [{ name: "db", status: "ACTIVE_HEALTHY", healthy: true }];
	} else if (url.pathname.endsWith("/migrations")) {
		body = [{ version: "20260912" }];
	} else if (url.pathname.endsWith("/functions")) {
		body = [{ slug: "send-welcome-email", status: "ACTIVE", version: 2 }];
	} else if (url.pathname.endsWith("/secrets")) {
		body = [{ name: "CRON_SECRET", value: "DO_NOT_PRINT" }, { name: "SUPABASE_URL", value: "DO_NOT_PRINT" }];
	} else if (url.pathname.endsWith("/logs")) {
		body = { result: [{ error_count: 0 }], error: null };
	} else if (query.includes("'table:'")) {
		body = getObservations().schemaObjects;
	} else if (query.includes("cron.job")) {
		body = [{ name: "daily-article-reminder", active: true }];
	} else if (query.includes("vault.secrets")) {
		body = [{ name: "cron_secret" }];
	} else if (query.includes("http_request") && !query.includes("and not (pn.nspname")) {
		body = [];
	} else if (query) {
		body = [{ name: "auth.users.send_welcome_email_trigger", active: true }];
	} else {
		body = { status: "ACTIVE_HEALTHY", database: { version: "15.8.1.060", host: "DO_NOT_PRINT" } };
	}

	return Response.json(body);
});

describe("운영 상태 비교", () => {
	it("정상 관측은 Runtime 관측 불가 경고만 남긴다", () => {
		expect(compareSupabaseState({ manifest: MANIFEST, observations: getObservations() })).toEqual([
			expect.objectContaining({ category: "runtime", severity: "warning", code: "unobservable" }),
		]);
	});
	it.each(["services", "schemaObjects", "functions", "secrets", "cron", "triggers", "vault"])("%s 필수 누락은 오류다", (category) => {
		const findings = compareSupabaseState({ manifest: MANIFEST, observations: { ...getObservations(), [category]: [] } });
		expect(findings).toContainEqual(expect.objectContaining({ category, severity: "error", code: "missing" }));
	});
	it("직접 SQL 적용으로 이력이 없어도 실제 필수 스키마가 있으면 경고만 남긴다", () => {
		const findings = compareSupabaseState({ manifest: MANIFEST, observations: { ...getObservations(), migrations: [] } });
		expect(findings).toContainEqual(expect.objectContaining({ category: "migrations", severity: "warning", code: "missing" }));
		expect(findings.every((finding: { severity: string }) => finding.severity === "warning")).toBe(true);
	});
	it("같은 이름이어도 함수 인자 타입이 다르면 필수 스키마 누락이다", () => {
		const observations = getObservations();
		observations.schemaObjects = observations.schemaObjects.filter(({ name }) => !name.startsWith("function:"));
		observations.schemaObjects.push({ name: "function:memo.get_admin_stats()" });
		const findings = compareSupabaseState({ manifest: MANIFEST, observations });
		expect(findings).toContainEqual(expect.objectContaining({ category: "schemaObjects", severity: "error", code: "missing" }));
		expect(findings).not.toContainEqual(expect.objectContaining({ category: "schemaObjects", code: "extra" }));
	});
	it("필수 Webhook 누락도 오류다", () => {
		const findings = compareSupabaseState({ manifest: { ...MANIFEST, webhooks: ["feedback.feedbacks.send"] }, observations: getObservations() });
		expect(findings).toContainEqual(expect.objectContaining({ category: "webhooks", severity: "error", code: "missing" }));
	});
	it.each(["cron", "triggers", "webhooks"])("%s 비활성 상태는 오류다", (category) => {
		const findings = compareSupabaseState({ manifest: MANIFEST, observations: { ...getObservations(), [category]: [{ name: "disabled", active: false }] } });
		expect(findings).toContainEqual(expect.objectContaining({ category, severity: "error", code: "unhealthy" }));
	});
	it("추가 리소스와 버전 변화는 경고다", () => {
		const observations = getObservations();
		observations.secrets.push({ name: "NEW_SECRET" });
		observations.project.postgresVersion = "17.4.1.0";
		observations.functions[0].version = 3;
		const findings = compareSupabaseState({ manifest: MANIFEST, observations });
		expect(findings.filter((finding: { code: string }) => finding.code === "version_drift")).toHaveLength(2);
		expect(findings.every((finding: { severity: string }) => finding.severity === "warning")).toBe(true);
	});
	it("DB와 함수 비정상, HTTP 및 로그 오류는 실패한다", () => {
		const observations = getObservations();
		observations.project.status = "ACTIVE_UNHEALTHY";
		observations.services[0].status = "UNHEALTHY";
		observations.functions[0].status = "THROTTLED";
		observations.functionHttpErrors.count = 4;
		observations.functionLogErrors.count = 2;
		const findings = compareSupabaseState({ manifest: MANIFEST, observations });
		expect(findings.filter((finding: { severity: string }) => finding.severity === "error")).toHaveLength(5);
	});
});

describe("Management API 조회", () => {
	it("정상 리소스와 0건 오류도 Summary에 표시하고 JSON 관측을 보존한다", async () => {
		const result = await auditSupabase({ manifest: MANIFEST, token: "TOKEN", now: new Date("2026-09-20T12:34:45Z"), fetcher: createFetcher() });
		const summary = formatAuditSummary(result);
		expect(summary).toContain("| db | ACTIVE&#95;HEALTHY |");
		expect(summary).toContain("15.8.1.060");
		expect(summary).toContain("| send-welcome-email | 2 | ACTIVE |");
		expect(summary).toContain("| HTTP 오류 | 0 | 2026-09-19T12:34:00.000Z | 2026-09-20T12:34:00.000Z |");
		expect(summary).toContain("| 로그 오류 | 0 |");
		expect(summary).toContain("| 20260912 |");
		expect(summary).toContain("| daily-article-reminder | 활성 |");
		expect(summary).toContain("| auth.users.send&#95;welcome&#95;email&#95;trigger | 활성 |");
		expect(summary).toContain("DB Webhook (0개)");
		expect(summary).toContain("| cron&#95;secret |");
		expect(summary).toContain("| CRON&#95;SECRET |");
		expect(summary).not.toContain("DO_NOT_PRINT");
		expect(result.observations.functions).toEqual(getObservations().functions);
		expect(result.slackMessage).not.toContain("배포된 Edge Functions");
	});
	it("관측 실패는 빈 목록이나 오류 0건으로 표시하지 않는다", async () => {
		const fetcher = createFetcher((url) => url.pathname.endsWith("/functions") || url.pathname.endsWith("/logs") ? new Response("failed", { status: 403 }) : undefined);
		const result = await auditSupabase({ manifest: MANIFEST, token: "TOKEN", fetcher });
		const summary = formatAuditSummary(result);
		expect(summary).toContain("### 배포된 Edge Functions\n\n조회하지 못했습니다.");
		expect(summary).toContain("| HTTP 오류 | 확인 불가 | 확인 불가 | 확인 불가 |");
		expect(summary).not.toContain("배포된 Edge Functions (0개)");
		expect(result.exitCode).toBe(1);
	});
	it("Summary는 비밀 필드를 출력하지 않고 이름의 Markdown 구문을 이스케이프한다", () => {
		const result = {
			projectRef: MANIFEST.projectRef, checkedAt: "2026-09-20T12:00:00Z", errorCount: 0, warningCount: 0, findings: [],
			observations: { ...getObservations(), webhooks: [{ name: "hook|<img>\n[link](url)", active: false, url: "DO_NOT_PRINT", command: "DO_NOT_PRINT" }], vault: [{ name: "key", decrypted_secret: "DO_NOT_PRINT" }] },
		};
		const summary = formatAuditSummary(result);
		expect(summary).toContain("hook&#124;&lt;img&gt; &#91;link&#93;&#40;url&#41; | 비활성");
		expect(summary).not.toContain("DO_NOT_PRINT");
	});
	it("계약에 맞는 읽기 전용 요청과 정확한 24시간 범위를 사용하고 비밀을 버린다", async () => {
		const fetcher = createFetcher();
		const result = await auditSupabase({ manifest: MANIFEST, token: "TOKEN", now: new Date("2026-09-20T12:34:45Z"), fetcher });
		expect(result.exitCode).toBe(0);
		expect(JSON.stringify(result)).not.toContain("DO_NOT_PRINT");
		expect(JSON.stringify(result)).not.toContain("TOKEN");
		expect(fetcher).toHaveBeenCalledTimes(12);
		for (const [input, options] of fetcher.mock.calls) {
			const url = new URL(input);
			expect(options.headers).toMatchObject({ authorization: "Bearer TOKEN" });
			if (options.method === "POST") {
				expect(url.pathname.endsWith("/database/query/read-only")).toBe(true);
				expect(String(options.body)).not.toMatch(/decrypted_secret|\bcommand\b|tgargs|prosrc|pg_get_functiondef|select \*/i);
			}
			if (url.pathname.includes("/analytics/")) {
				expect(url.pathname).toBe(`/v1/projects/${MANIFEST.projectRef}/analytics/endpoints/logs`);
				expect(url.searchParams.get("iso_timestamp_start")).toBe("2026-09-19T12:34:00.000Z");
				expect(url.searchParams.get("iso_timestamp_end")).toBe("2026-09-20T12:34:00.000Z");
				expect(url.searchParams.get("sql")).toContain("toFloat64(count(*)) as error_count from logs where source = 'function_");
				expect(url.searchParams.get("sql")).not.toContain("event_message");
			}
		}
	});
	it("트리거 관측은 플랫폼 내부 스키마를 제외하고 auth의 앱 트리거는 유지한다", async () => {
		const fetcher = createFetcher();
		await auditSupabase({ manifest: MANIFEST, token: "TOKEN", fetcher });
		const queries = fetcher.mock.calls.filter(([, options]) => options.body).map(([, options]) => JSON.parse(String(options.body)).query as string);
		const triggerQueries = queries.filter((query) => query.includes("pg_catalog.pg_trigger"));
		expect(triggerQueries).toHaveLength(2);
		for (const query of triggerQueries) {
			expect(query).toContain("'storage', 'realtime', 'vault', 'pgsodium'");
			expect(query).toContain("'cron', 'extensions'");
			for (const applicationSchema of ["auth", "public", "memo", "feedback", "billing"]) {
				expect(query).not.toContain(`'${applicationSchema}'`);
			}
		}
		const applicationQuery = triggerQueries.find((query) => query.includes("and not (pn.nspname"));
		expect(applicationQuery).not.toContain("n.nspname in (");
		expect(applicationQuery).toContain("and not (pn.nspname = 'supabase_functions' and p.proname = 'http_request')");
		const webhookQuery = triggerQueries.find((query) => !query.includes("and not (pn.nspname"));
		expect(webhookQuery).toContain("and pn.nspname = 'supabase_functions' and p.proname = 'http_request'");
	});
	it("미선언 public·auth 앱 트리거를 경고로 남긴다", () => {
		const observations = getObservations();
		observations.triggers.push({ name: "public.documents.on_update", active: true }, { name: "auth.users.custom_signup", active: true });
		const findings = compareSupabaseState({ manifest: MANIFEST, observations });
		expect(findings.filter((finding: { category: string; code: string }) => finding.category === "triggers" && finding.code === "extra")).toHaveLength(2);
	});
	it("스키마 조회 실패를 정상이나 누락으로 바꾸지 않는다", async () => {
		const fetcher = createFetcher((_url, query) => query.includes("'table:'") ? new Response("permission denied", { status: 403 }) : undefined);
		const result = await auditSupabase({ manifest: MANIFEST, token: "TOKEN", fetcher });
		expect(result.exitCode).toBe(1);
		expect(result.findings).toContainEqual(expect.objectContaining({ category: "schemaObjects", code: "unobservable" }));
		expect(result.findings).not.toContainEqual(expect.objectContaining({ category: "schemaObjects", code: "missing" }));
	});
	it("SQL 권한 부족은 누락과 구분하고 감사를 실패시키며 응답 본문을 노출하지 않는다", async () => {
		const fetcher = createFetcher((_url, query) => query.includes("vault.secrets") ? new Response("42501 permission denied DO_NOT_PRINT", { status: 500 }) : undefined);
		const result = await auditSupabase({ manifest: MANIFEST, token: "TOKEN", fetcher });
		expect(result.exitCode).toBe(1);
		expect(result.findings).toContainEqual(expect.objectContaining({ category: "vault", code: "unobservable", severity: "error" }));
		expect(result.findings).not.toContainEqual(expect.objectContaining({ category: "vault", code: "missing" }));
		expect(JSON.stringify(result)).not.toContain("DO_NOT_PRINT");
	});
	it.each([401, 403, 429, 500])("핵심 API HTTP %s는 오류다", async (status) => {
		const fetcher = createFetcher((url) => url.pathname.endsWith("/functions") ? new Response("DO_NOT_PRINT", { status }) : undefined);
		const result = await auditSupabase({ manifest: MANIFEST, token: "TOKEN", fetcher });
		expect(result.exitCode).toBe(1);
		expect(JSON.stringify(result)).not.toContain("DO_NOT_PRINT");
	});
	it("SQL 401은 권한 문구가 있어도 인증 실패다", async () => {
		const fetcher = createFetcher((_url, query) => query ? new Response("permission denied", { status: 401 }) : undefined);
		const result = await auditSupabase({ manifest: MANIFEST, token: "TOKEN", fetcher });
		expect(result.exitCode).toBe(1);
	});
	it.each([{ error: "DO_NOT_PRINT" }, { result: [] }, { result: [{ error_count: "0" }] }, { result: [{ error_count: -1 }] }])("잘못된 로그 응답을 정상 0건으로 처리하지 않는다: %j", async (body) => {
		const fetcher = createFetcher((url) => url.pathname.endsWith("/logs") ? Response.json(body) : undefined);
		const result = await auditSupabase({ manifest: MANIFEST, token: "TOKEN", fetcher });
		expect(result.exitCode).toBe(1);
		expect(JSON.stringify(result)).not.toContain("DO_NOT_PRINT");
	});
	it("토큰 부재와 선언 오류는 외부 호출 없이 실패한다", async () => {
		const fetcher = createFetcher();
		expect((await auditSupabase({ manifest: MANIFEST, fetcher })).exitCode).toBe(1);
		expect((await auditSupabase({ manifest: {}, token: "TOKEN", fetcher })).exitCode).toBe(1);
		expect(fetcher).not.toHaveBeenCalled();
	});
	it("네트워크 예외 내용은 출력하지 않는다", async () => {
		const result = await auditSupabase({ manifest: MANIFEST, token: "TOKEN", fetcher: async () => { throw new Error("DO_NOT_PRINT"); } });
		expect(result.exitCode).toBe(1);
		expect(JSON.stringify(result)).not.toContain("DO_NOT_PRINT");
	});
	it("HTTP 성공의 null 본문은 조회 성공으로 처리하지 않는다", async () => {
		const fetcher = createFetcher((url) => url.pathname.endsWith("/functions") ? Response.json(null) : undefined);
		const result = await auditSupabase({ manifest: MANIFEST, token: "TOKEN", fetcher });
		expect(result.exitCode).toBe(1);
		expect(result.findings).toContainEqual(expect.objectContaining({ category: "functions", code: "invalid_response" }));
	});
	it("실제 로그 집계가 양수이면 exit 1을 반환한다", async () => {
		const fetcher = createFetcher((url) => url.pathname.endsWith("/logs") ? Response.json({ result: [{ error_count: 7 }] }) : undefined);
		const result = await auditSupabase({ manifest: MANIFEST, token: "TOKEN", fetcher });
		expect(result.exitCode).toBe(1);
		expect(result.errorCount).toBe(2);
	});
	it("annotation의 줄바꿈과 퍼센트를 이스케이프한다", () => {
		expect(formatAuditAnnotation({ severity: "warning", message: "x%\n::error::bad\r" })).toBe("::warning::x%25%0A::error::bad%0D");
	});
	it("운영 선언이 저장소 함수와 직접 적용 SQL의 필수 스키마를 포함한다", () => {
		const manifest = JSON.parse(readFileSync(".github/supabase-audit-manifest.json", "utf8"));
		const root = "packages/supabase-edge-functions/supabase";
		const functions = readdirSync(`${root}/functions`, { withFileTypes: true }).filter((file) => file.isDirectory()).map((file) => file.name).sort();
		expect(manifest.functions.map((entry: { name: string }) => entry.name)).toEqual(expect.arrayContaining(functions));
		expect(manifest.schemaObjects).toEqual(expect.arrayContaining(["table:memo.highlight", "column:memo.memo.deleted_at", "column:feedback.feedbacks.email", "function:memo.get_highlight_counts(text[])", "function:memo.send_welcome_email()", "function:memo.get_admin_stats(boolean)"]));
	});
});
