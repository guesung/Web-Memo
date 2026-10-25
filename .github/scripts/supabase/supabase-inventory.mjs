/**
 * 운영 Supabase의 스키마·테이블·컬럼·DB 함수와 Edge Function 배포 버전을 읽어
 * docs/supabase-inventory.md 본문을 만듭니다.
 *
 * 문서가 매일 바뀌지 않도록 조회 시각·건강 상태처럼 흔들리는 값은 싣지 않고,
 * 모든 목록을 로캘과 무관한 순서로 정렬합니다. 행 데이터·secret 값·함수 본문·
 * Webhook URL은 조회하지 않습니다.
 */

/** 인벤토리 대상인 운영 프로젝트입니다. */
export const SUPABASE_PROJECT_REF = "czwtqukymcqoberdoltq";

/** Supabase가 만들고 관리하는 스키마입니다. 여기에 없는 스키마는 앱 스키마로 분류합니다. */
export const MANAGED_SCHEMAS = new Set([
	"_analytics",
	"_realtime",
	"auth",
	"cron",
	"extensions",
	"graphql",
	"graphql_public",
	"net",
	"pgbouncer",
	"pgsodium",
	"pgsodium_masks",
	"realtime",
	"storage",
	"supabase_functions",
	"supabase_migrations",
	"vault",
]);

const SCHEMA_FILTER = `n.nspname not in ('pg_catalog', 'information_schema')
  and n.nspname not like 'pg\\_toast%'
  and n.nspname not like 'pg\\_temp\\_%'`;

/** 스키마를 이름으로 고정하지 않고 카탈로그에서 찾습니다. 새 스키마도 자동으로 잡힙니다. */
const SCHEMA_QUERY = `select n.nspname as schema
from pg_catalog.pg_namespace n
where ${SCHEMA_FILTER}`;

/** 파티션 자식 테이블은 날짜마다 생겨 문서를 흔들므로 부모 테이블만 싣습니다. */
const COLUMN_QUERY = `select n.nspname as schema, c.relname as "table", a.attname as "column",
  pg_catalog.format_type(a.atttypid, a.atttypmod) as type, a.attnum as position
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
left join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
where c.relkind in ('r', 'p') and not c.relispartition and ${SCHEMA_FILTER}`;

/** 확장이 설치한 함수(pgsodium·pg_net 등 수백 개)는 우리가 관리하는 대상이 아니라 뺍니다. 본문은 읽지 않습니다. */
const FUNCTION_QUERY = `select n.nspname as schema, p.proname as name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
  pg_catalog.pg_get_function_result(p.oid) as result
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where p.prokind in ('f', 'p') and ${SCHEMA_FILTER}
  and not exists (
    select 1 from pg_catalog.pg_depend d
    where d.classid = 'pg_catalog.pg_proc'::pg_catalog.regclass and d.objid = p.oid and d.deptype = 'e'
  )`;

/**
 * 인벤토리에 필요한 메타데이터를 모두 조회합니다.
 * 하나라도 실패하거나 응답 형식이 어긋나면 예외를 던집니다 — 조회 실패를 빈 목록으로
 * 해석해 문서에서 스키마가 사라지는 일을 막기 위해서입니다.
 */
export const collectSupabaseInventory = async ({ token, projectRef = SUPABASE_PROJECT_REF, fetcher = fetch }) => {
	if (!token) {
		throw new Error("SUPABASE_ACCESS_TOKEN이 없습니다");
	}

	const request = async ({ label, path, query }) => {
		const response = await fetcher(`https://api.supabase.com/v1/projects/${projectRef}${path}`, {
			method: query ? "POST" : "GET",
			headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
			...(query ? { body: JSON.stringify({ query }) } : {}),
			signal: AbortSignal.timeout(30000),
		});

		if (!response.ok) {
			throw new Error(`${label} 조회 실패: HTTP ${response.status}`);
		}

		const body = await response.json();

		if (!Array.isArray(body)) {
			throw new Error(`${label} 응답이 배열이 아닙니다`);
		}

		return body;
	};
	const readOnlyQuery = (label, query) => request({ label, path: "/database/query/read-only", query });

	const [schemaRows, columnRows, functionRows, edgeFunctionRows] = await Promise.all([
		readOnlyQuery("스키마", SCHEMA_QUERY),
		readOnlyQuery("테이블·컬럼", COLUMN_QUERY),
		readOnlyQuery("DB 함수", FUNCTION_QUERY),
		request({ label: "Edge Function", path: "/functions" }),
	]);

	return buildInventory({ schemaRows, columnRows, functionRows, edgeFunctionRows });
};

/** 조회 결과 행을 검증하고 정렬된 인벤토리 구조로 묶습니다. */
export const buildInventory = ({ schemaRows, columnRows, functionRows, edgeFunctionRows }) => {
	assertRows("스키마", schemaRows, { schema: "string" });
	assertRows("테이블·컬럼", columnRows, { schema: "string", table: "string" });
	assertRows("DB 함수", functionRows, { schema: "string", name: "string", arguments: "string", result: "string" });
	assertRows("Edge Function", edgeFunctionRows, { slug: "string", version: "number" });

	const schemas = new Map(
		schemaRows.map(({ schema }) => [schema, { name: schema, managed: MANAGED_SCHEMAS.has(schema), tables: new Map(), functions: [] }]),
	);
	const getSchema = (name) => {
		const schema = schemas.get(name);

		if (!schema) {
			throw new Error(`스키마 목록에 없는 스키마의 객체가 조회됐습니다: ${name}`);
		}

		return schema;
	};

	for (const row of columnRows) {
		const { tables } = getSchema(row.schema);

		if (!tables.has(row.table)) {
			tables.set(row.table, { name: row.table, columns: [] });
		}

		// 컬럼이 하나도 없는 테이블은 left join 결과로 column이 null인 행 하나만 옵니다.
		if (row.column !== null && row.column !== undefined) {
			tables.get(row.table).columns.push({ name: row.column, type: row.type, position: Number(row.position) });
		}
	}

	for (const row of functionRows) {
		getSchema(row.schema).functions.push({ name: row.name, arguments: row.arguments, result: row.result });
	}

	const hasAppTable = [...schemas.values()].some((schema) => !schema.managed && schema.tables.size > 0);

	if (!hasAppTable) {
		throw new Error("앱 스키마의 테이블이 하나도 조회되지 않았습니다. 조회가 잘못됐을 가능성이 높아 문서를 만들지 않습니다");
	}

	return {
		schemas: [...schemas.values()].sort(byName).map((schema) => ({
			name: schema.name,
			managed: schema.managed,
			tables: [...schema.tables.values()].sort(byName).map((table) => ({
				name: table.name,
				columns: table.columns.sort((left, right) => left.position - right.position),
			})),
			functions: schema.functions.sort((left, right) => compareText(`${left.name}(${left.arguments})`, `${right.name}(${right.arguments})`)),
		})),
		edgeFunctions: edgeFunctionRows.map(({ slug, version }) => ({ name: slug, version })).sort(byName),
	};
};

/** 인벤토리를 Markdown 문서로 만듭니다. 같은 입력이면 항상 같은 문자열을 돌려줍니다. */
export const renderInventoryMarkdown = (inventory, { projectRef = SUPABASE_PROJECT_REF } = {}) => {
	const appSchemas = inventory.schemas.filter((schema) => !schema.managed);
	const managedSchemas = inventory.schemas.filter((schema) => schema.managed);
	const lines = [
		"# Supabase 인벤토리",
		"",
		"> 이 문서는 자동 생성됩니다. 손으로 고치지 마세요.",
		"> 생성기: `.github/scripts/supabase/generate-supabase-inventory.mjs` · 갱신: `chore-supabase-inventory.yml`",
		"",
		`운영 Supabase 프로젝트 \`${projectRef}\`를 읽기 전용으로 조회한 결과입니다.`,
		"운영 상태가 이 문서와 달라지면 매일 08:00 KST 실행이 갱신 PR을 열고, 다시 같아지면 그 PR을 닫습니다.",
		"",
		"## 수록 범위",
		"",
		"- PostgreSQL의 모든 스키마를 카탈로그에서 찾아 싣습니다. 새 스키마도 자동으로 나타납니다.",
		"- 테이블은 컬럼 이름과 타입을 싣습니다. 파티션 자식 테이블은 뺍니다.",
		"- DB 함수는 이름·입력 타입·반환 타입을 싣습니다. 확장(extension)이 설치한 함수는 뺍니다.",
		"- Edge Function은 이름과 **배포 버전**을 싣습니다. 배포 버전은 함수를 배포할 때마다 1씩 오르는 번호이며, Edge Runtime이나 Deno 버전이 아닙니다. 정확한 Runtime 버전은 현재 쓰는 조회 경로(Management API)에서 얻을 수 없어 싣지 않습니다.",
		"- 행 데이터, secret 값, 함수 본문, Webhook URL은 싣지 않습니다. 조회 시각과 건강 상태처럼 수시로 바뀌는 값도 싣지 않습니다.",
		"",
		"## 앱 스키마",
		"",
		...appSchemas.flatMap(renderSchema),
		"## Supabase 관리 스키마",
		"",
		"Supabase가 만들고 관리하는 스키마입니다. 플랫폼 업데이트로 바뀔 수 있습니다.",
		"",
		...managedSchemas.flatMap(renderSchema),
		"## Edge Functions",
		"",
		...renderEdgeFunctions(inventory.edgeFunctions),
	];

	return `${lines.join("\n").trimEnd()}\n`;
};

const renderSchema = (schema) => {
	const lines = [`### \`${schema.name}\``, ""];

	if (schema.tables.length === 0 && schema.functions.length === 0) {
		lines.push("테이블과 DB 함수가 없습니다.", "");

		return lines;
	}

	for (const table of schema.tables) {
		lines.push(`#### 테이블 \`${schema.name}.${table.name}\``, "");

		if (table.columns.length === 0) {
			lines.push("컬럼이 없습니다.", "");
			continue;
		}

		lines.push("| 컬럼 | 타입 |", "| --- | --- |");

		for (const column of table.columns) {
			lines.push(`| ${code(column.name)} | ${code(column.type)} |`);
		}

		lines.push("");
	}

	if (schema.functions.length > 0) {
		lines.push(`#### DB 함수 (${schema.functions.length}개)`, "", "| 함수 | 반환 타입 |", "| --- | --- |");

		for (const fn of schema.functions) {
			lines.push(`| ${code(`${fn.name}(${fn.arguments})`)} | ${code(fn.result)} |`);
		}

		lines.push("");
	}

	return lines;
};

const renderEdgeFunctions = (edgeFunctions) => {
	if (edgeFunctions.length === 0) {
		return ["배포된 Edge Function이 없습니다."];
	}

	return ["| 함수 | 배포 버전 |", "| --- | --- |", ...edgeFunctions.map((fn) => `| ${code(fn.name)} | ${fn.version} |`)];
};

/** 표 안의 값이 표 구분자나 백틱을 품어도 깨지지 않게 감쌉니다. */
const code = (value) => {
	const text = String(value).replaceAll("|", "\\|");
	const fence = text.includes("`") ? "``" : "`";

	return `${fence}${text}${fence}`;
};

const assertRows = (label, rows, shape) => {
	if (!Array.isArray(rows)) {
		throw new Error(`${label} 응답이 배열이 아닙니다`);
	}

	for (const row of rows) {
		for (const [key, type] of Object.entries(shape)) {
			if (typeof row?.[key] !== type) {
				throw new Error(`${label} 응답 형식이 올바르지 않습니다: ${key}`);
			}
		}
	}
};

/** 실행 환경의 로캘에 따라 순서가 바뀌지 않도록 코드 포인트로 비교합니다. */
const compareText = (left, right) => {
	if (left < right) {
		return -1;
	}

	if (left > right) {
		return 1;
	}

	return 0;
};

const byName = (left, right) => compareText(left.name, right.name);
