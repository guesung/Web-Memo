/** Management API에서 비밀 값 대신 감사에 필요한 메타데이터만 조회합니다. */
export const collectSupabaseState = async ({ manifest, token, now = new Date(), fetcher = fetch }) => {
	const observations = {};
	const failures = [];
	const request = async ({ category, path, query }) => {
		try {
			const response = await fetcher(`https://api.supabase.com/v1/projects/${manifest.projectRef}${path}`, {
				method: query ? "POST" : "GET",
				headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
				...(query ? { body: JSON.stringify({ query }) } : {}),
				signal: AbortSignal.timeout(30000),
			});
			if (!response.ok) {
				const body = await response.text();
				const permissionDenied = query && response.status !== 401 && /42501|permission denied|insufficient_privilege/i.test(body);
				failures.push({ category, severity: permissionDenied ? "warning" : "error", code: permissionDenied ? "unobservable" : "api_failure", message: `${category}: HTTP ${response.status}${permissionDenied ? " (SQL 권한 부족으로 관측 불가)" : " 조회 실패"}` });
				return undefined;
			}
			return await response.json();
		} catch {
			failures.push({ category, severity: "error", code: "api_failure", message: `${category}: 응답 해석 또는 네트워크 요청 실패` });
			return undefined;
		}
	};
	const jobs = [
		{ category: "project", path: "", pick: (body) => ({ status: body.status, postgresVersion: body.database?.version }) },
		{ category: "services", path: `/health?services=${manifest.services.join(",")}`, pick: (body) => body.map(({ name, status }) => ({ name, status })) },
		{ category: "migrations", path: "/database/migrations", pick: (body) => body.map(({ version }) => ({ name: version })) },
		{ category: "functions", path: "/functions", pick: (body) => body.map(({ slug, status, version }) => ({ name: slug, status, version })) },
		{ category: "secrets", path: "/secrets", pick: (body) => body.filter(({ name }) => !name.startsWith("SUPABASE_")).map(({ name }) => ({ name })) },
		...Object.entries(RESOURCE_QUERIES).map(([category, query]) => ({ category, query, path: "/database/query/read-only", pick: (body) => body.map(({ name, active }) => ({ name, ...(active === undefined ? {} : { active }) })) })),
	];
	const end = new Date(Math.floor(now.getTime() / 60000) * 60000);
	const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
	for (const [category, sql] of Object.entries(LOG_QUERIES)) {
		const parameters = new URLSearchParams({ sql, iso_timestamp_start: start.toISOString(), iso_timestamp_end: end.toISOString() });
		jobs.push({ category, path: `/analytics/endpoints/logs?${parameters}`, pick: (body) => {
			if (body.error || !Array.isArray(body.result) || body.result.length !== 1 || !Number.isSafeInteger(body.result[0].error_count) || body.result[0].error_count < 0) {
				throw new Error("Invalid log result");
			}
			return { count: body.result[0].error_count, start: start.toISOString(), end: end.toISOString() };
		} });
	}
	await Promise.all(jobs.map(async (job) => {
		const body = await request(job);
		if (body === undefined) {
			return;
		}
		try {
			observations[job.category] = job.pick(body);
		} catch {
			failures.push({ category: job.category, severity: "error", code: "invalid_response", message: `${job.category}: API 응답 형식이 올바르지 않습니다` });
		}
	}));

	return { observations, failures };
};

/** 명령·트리거 인자·Webhook URL·Vault 값은 조회하지 않습니다. */
const TRIGGER_QUERY = `select n.nspname || '.' || c.relname || '.' || t.tgname as name,
  t.tgenabled in ('O', 'A') as active
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
join pg_catalog.pg_proc p on p.oid = t.tgfoid
join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
where not t.tgisinternal and n.nspname not in ('pg_catalog', 'information_schema')`;

/** 관리 스키마 권한은 개별 조회하여 다른 리소스의 감사와 분리합니다. */
const RESOURCE_QUERIES = {
	cron: "select jobname as name, active from cron.job",
	triggers: TRIGGER_QUERY,
	webhooks: `${TRIGGER_QUERY} and pn.nspname = 'supabase_functions' and p.proname = 'http_request'`,
	vault: "select name from vault.secrets",
};

/** Unified logs의 ClickHouse SQL 계약입니다. UInt64 문자열 대신 숫자 건수만 반환합니다. */
const LOG_QUERIES = {
	functionHttpErrors: "select toFloat64(count(*)) as error_count from logs where source = 'function_edge_logs' and toInt32OrZero(log_attributes['response.status_code']) >= 400",
	functionLogErrors: "select toFloat64(count(*)) as error_count from logs where source = 'function_logs' and (log_attributes['level'] = 'error' or log_attributes['event_type'] = 'UncaughtException')",
};
