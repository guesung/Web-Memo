import { requestJson } from "./http.mjs";

/** 문서가 추적하는 Production 프로젝트입니다. */
export const PROJECT_REF = "czwtqukymcqoberdoltq";
/** 상세 조회를 허용하는 애플리케이션 스키마입니다. */
export const SCHEMAS = ["feedback", "memo"];
/** 사용자 데이터를 읽지 않고 카탈로그 메타데이터만 한 번에 조회합니다. */
export const CATALOG_QUERY = `
SELECT pg_catalog.json_build_object('tables', COALESCE(pg_catalog.json_agg(table_data), '[]'::json)) AS catalog
FROM (
 SELECT pg_catalog.json_build_object(
  'schema', ns.nspname, 'name', tbl.relname,
  'rls', tbl.relrowsecurity, 'forceRls', tbl.relforcerowsecurity,
  'columns', COALESCE((SELECT pg_catalog.json_agg(pg_catalog.json_build_object(
   'name', col.attname, 'ordinal', col.attnum,
   'type', pg_catalog.format_type(col.atttypid, col.atttypmod),
   'notNull', col.attnotnull, 'default', pg_catalog.pg_get_expr(def.adbin, def.adrelid)) ORDER BY col.attnum)
   FROM pg_catalog.pg_attribute col LEFT JOIN pg_catalog.pg_attrdef def ON def.adrelid = col.attrelid AND def.adnum = col.attnum
   WHERE col.attrelid = tbl.oid AND col.attnum > 0 AND NOT col.attisdropped), '[]'::json),
  'constraints', COALESCE((SELECT pg_catalog.json_agg(pg_catalog.json_build_object(
   'name', con.conname, 'kind', con.contype,
   'definition', pg_catalog.pg_get_constraintdef(con.oid, false),
   'columns', COALESCE((SELECT pg_catalog.json_agg(att.attname ORDER BY key.ordinality)
    FROM pg_catalog.unnest(con.conkey) WITH ORDINALITY AS key(attnum, ordinality)
    JOIN pg_catalog.pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = key.attnum), '[]'::json),
   'targetSchema', target_ns.nspname, 'targetTable', target.relname,
   'targetColumns', COALESCE((SELECT pg_catalog.json_agg(att.attname ORDER BY key.ordinality)
    FROM pg_catalog.unnest(con.confkey) WITH ORDINALITY AS key(attnum, ordinality)
    JOIN pg_catalog.pg_attribute att ON att.attrelid = con.confrelid AND att.attnum = key.attnum), '[]'::json)) ORDER BY con.conname)
   FROM pg_catalog.pg_constraint con
   LEFT JOIN pg_catalog.pg_class target ON target.oid = con.confrelid
   LEFT JOIN pg_catalog.pg_namespace target_ns ON target_ns.oid = target.relnamespace
   WHERE con.conrelid = tbl.oid), '[]'::json),
  'indexes', COALESCE((SELECT pg_catalog.json_agg(pg_catalog.json_build_object(
   'name', idx.relname, 'definition', pg_catalog.pg_get_indexdef(idx.oid)) ORDER BY idx.relname)
   FROM pg_catalog.pg_index link JOIN pg_catalog.pg_class idx ON idx.oid = link.indexrelid
   WHERE link.indrelid = tbl.oid), '[]'::json),
  'policies', COALESCE((SELECT pg_catalog.json_agg(pg_catalog.json_build_object(
   'name', policy.polname, 'command', policy.polcmd, 'permissive', policy.polpermissive,
   'roles', (SELECT pg_catalog.json_agg(CASE WHEN role_oid = 0 THEN 'public' ELSE pg_catalog.pg_get_userbyid(role_oid) END)
    FROM pg_catalog.unnest(policy.polroles) AS role_oid),
   'using', pg_catalog.pg_get_expr(policy.polqual, policy.polrelid),
   'check', pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid)) ORDER BY policy.polname)
   FROM pg_catalog.pg_policy policy WHERE policy.polrelid = tbl.oid), '[]'::json),
  'triggers', COALESCE((SELECT pg_catalog.json_agg(pg_catalog.json_build_object(
   'name', trigger.tgname,
   'timing', CASE WHEN (trigger.tgtype & 2) <> 0 THEN 'BEFORE' WHEN (trigger.tgtype & 64) <> 0 THEN 'INSTEAD OF' ELSE 'AFTER' END,
   'orientation', CASE WHEN (trigger.tgtype & 1) <> 0 THEN 'ROW' ELSE 'STATEMENT' END,
   'events', pg_catalog.array_remove(ARRAY[
    CASE WHEN (trigger.tgtype & 4) <> 0 THEN 'INSERT' END,
    CASE WHEN (trigger.tgtype & 8) <> 0 THEN 'DELETE' END,
    CASE WHEN (trigger.tgtype & 16) <> 0 THEN 'UPDATE' END,
    CASE WHEN (trigger.tgtype & 32) <> 0 THEN 'TRUNCATE' END], NULL),
   'enabled', trigger.tgenabled, 'functionSchema', function_ns.nspname, 'functionName', proc.proname) ORDER BY trigger.tgname)
   FROM pg_catalog.pg_trigger trigger JOIN pg_catalog.pg_proc proc ON proc.oid = trigger.tgfoid
   JOIN pg_catalog.pg_namespace function_ns ON function_ns.oid = proc.pronamespace
   WHERE trigger.tgrelid = tbl.oid AND NOT trigger.tgisinternal), '[]'::json)
 ) AS table_data
 FROM pg_catalog.pg_class tbl JOIN pg_catalog.pg_namespace ns ON ns.oid = tbl.relnamespace
 WHERE ns.nspname IN ('feedback', 'memo') AND tbl.relkind IN ('r', 'p')
 ORDER BY ns.nspname, tbl.relname
) AS tables;
`;

/** 두 API 응답의 조회와 검증을 모두 마친 경우에만 문서를 반환합니다. */
export const fetchSchemaDocument = async (token) => {
	if (!token?.trim()) {
		throw new Error("SUPABASE_ACCESS_TOKEN이 필요합니다.");
	}
	const base = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
	const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
	let responses;
	try {
		responses = await Promise.all([
			requestJson(`${base}/database/query/read-only`, {
				method: "POST", headers, body: JSON.stringify({ query: CATALOG_QUERY, parameters: [] }),
			}),
			requestJson(`${base}/functions`, { headers }),
		]);
	} catch {
		/** API 에러 본문이 인증 정보를 반사할 수 있으므로 원문은 기록하지 않습니다. */
		throw new Error("Supabase 메타데이터 조회에 실패했습니다. 토큰 권한과 API 상태를 확인하세요.");
	}
	const [catalogRows, functions] = responses;
	validateResponses(catalogRows, functions);

	return renderSchemaDocument(catalogRows[0].catalog, functions);
};

/** 검증된 카탈로그를 정렬하여 Mermaid와 Markdown 표로 렌더링합니다. */
export const renderSchemaDocument = (catalog, functions) => {
	const tables = catalog.tables.filter((table) => SCHEMAS.includes(table.schema)).sort((left, right) => compare(`${left.schema}.${left.name}`, `${right.schema}.${right.name}`));
	const ids = new Map(tables.map((table, index) => [JSON.stringify([table.schema, table.name]), `table_${index}`]));
	const lines = ["# Supabase 스키마", "", "> 자동 생성 문서입니다. 직접 수정하지 마세요.", "> 재생성: `pnpm generate-supabase-schema`", "", `- Production 프로젝트: \`${PROJECT_REF}\``, "- 스키마 범위: `feedback`, `memo`", "- 외부 FK 참조는 상세 정보만 표시하며 ERD에서는 제외합니다.", "", "## ERD", ""];
	if (!tables.length) {
		lines.push("없음", "");
	} else {
		lines.push("```mermaid", "erDiagram");
		for (const table of tables) {
			lines.push(`    ${ids.get(JSON.stringify([table.schema, table.name]))}["${mermaid(`${table.schema}.${table.name}`)}"]`);
		}
		for (const table of tables) {
			for (const constraint of named(table.constraints).filter((entry) => entry.kind === "f")) {
				const target = ids.get(JSON.stringify([constraint.targetSchema, constraint.targetTable]));
				if (target) {
					lines.push(`    ${target} }o..o{ ${ids.get(JSON.stringify([table.schema, table.name]))} : "${mermaid(constraint.name)}"`);
				}
			}
		}
		lines.push("```", "", "관계선은 FK 연결만 나타내며 카디널리티를 보장하지 않습니다.", "");
	}
	for (const schema of SCHEMAS) {
		lines.push(`## ${schema}`, "");
		const schemaTables = tables.filter((table) => table.schema === schema);
		if (!schemaTables.length) {
			lines.push("없음", "");
		}
		for (const table of schemaTables) {
			lines.push(`### ${escapeMarkdown(`${table.schema}.${table.name}`)}`, "", `RLS: ${table.rls} / FORCE RLS: ${table.forceRls}`, "");
			appendTable(lines, { title: "컬럼", headers: ["순서", "이름", "타입", "NOT NULL", "기본값"], rows: [...table.columns].sort((left, right) => left.ordinal - right.ordinal).map((column) => [column.ordinal, column.name, column.type, column.notNull, column.default]) });
			appendTable(lines, { title: "제약", headers: ["이름", "종류", "컬럼 (순서)", "참조", "정의"], rows: named(table.constraints).map((constraint) => [constraint.name, constraint.kind, constraint.columns.join(", "), foreignTarget(constraint), constraint.definition]) });
			appendTable(lines, { title: "인덱스", headers: ["이름", "정의"], rows: named(table.indexes).map((index) => [index.name, index.definition]) });
			appendTable(lines, { title: "정책", headers: ["이름", "명령", "PERMISSIVE", "역할", "USING", "WITH CHECK"], rows: named(table.policies).map((policy) => [policy.name, policy.command, policy.permissive, [...policy.roles].sort(compare).join(", "), policy.using, policy.check]) });
			appendTable(lines, { title: "트리거", headers: ["이름", "활성 상태", "시점", "이벤트", "실행 단위", "호출 대상 (인자 제외)"], rows: named(table.triggers).map((trigger) => [trigger.name, trigger.enabled, trigger.timing, [...trigger.events].sort(compare).join(", "), trigger.orientation, `${trigger.functionSchema}.${trigger.functionName}()`]) });
		}
	}
	appendTable(lines, { title: "배포 Edge Functions", level: 2, headers: ["이름", "상태"], rows: named(functions).map((entry) => [entry.name, entry.status]) });

	return `${lines.join("\n").trimEnd()}\n`;
};

const compare = (left, right) => (left < right ? -1 : Number(left > right));
const named = (entries) => [...entries].sort((left, right) => compare(left.name, right.name));
/** 출력할 값만 검사하여 폐기한 트리거 인자는 다시 읽지 않으며 탐지한 원문도 노출하지 않습니다. */
const safeMetadata = (value) => {
	const text = String(value ?? "없음");
	const credentialPatterns = [
		/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
		/\b(?:bearer|authorization|service_role)\b/i,
		/\b(?:api[_-]?key|api[_-]?token|access[_-]?token|refresh[_-]?token|client[_-]?secret|secret|password|token)\b["'\s]*[:=]["'\s]*[^\s,;)}]+/i,
		/\b(?:sb_secret_|sbp_|sk_live_|sk_test_|sk-proj-|gh[pousr]_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]+\b/,
		/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
	];
	if (credentialPatterns.some((pattern) => pattern.test(text))) {
		throw new Error("문서 메타데이터에서 민감한 인증 정보 패턴이 탐지되어 생성을 중단했습니다.");
	}

	return text;
};
const escapeMarkdown = (value) => safeMetadata(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("|", "&#124;").replaceAll("`", "&#96;").replaceAll("\\", "&#92;").replaceAll("*", "&#42;").replaceAll("_", "&#95;").replaceAll("[", "&#91;").replaceAll("]", "&#93;").replace(/\r\n|\r|\n/g, "<br>");
const mermaid = (value) => safeMetadata(value).replace(/[^a-zA-Z0-9_. -]/g, (character) => `#${character.codePointAt(0)};`);
const foreignTarget = (constraint) => {
	if (constraint.kind !== "f") {
		return null;
	}
	const external = SCHEMAS.includes(constraint.targetSchema) ? "" : " — 외부 참조(세부 제외)";

	return `${constraint.targetSchema}.${constraint.targetTable} (${constraint.targetColumns.join(", ")})${external}`;
};
const appendTable = (lines, section) => {
	lines.push(`${"#".repeat(section.level ?? 4)} ${section.title}`, "");
	if (!section.rows.length) {
		lines.push("없음", "");
		return;
	}
	lines.push(`| ${section.headers.join(" | ")} |`, `| ${section.headers.map(() => "---").join(" | ")} |`);
	for (const row of section.rows) {
		lines.push(`| ${row.map(escapeMarkdown).join(" | ")} |`);
	}
	lines.push("");
};

const fail = () => { throw new Error("Supabase 메타데이터 응답 구조가 올바르지 않습니다."); };
const object = (value) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) { fail(); }
};
const fields = (value, definition) => {
	object(value);
	for (const [key, type] of Object.entries(definition)) {
		if (type === "nullable" ? value[key] !== null && typeof value[key] !== "string" : typeof value[key] !== type) { fail(); }
	}
};
const array = (value, validate) => {
	if (!Array.isArray(value)) { fail(); }
	for (const entry of value) { validate(entry); }
};
const strings = (value) => array(value, (entry) => { if (typeof entry !== "string") { fail(); } });
const validateResponses = (rows, functions) => {
	if (!Array.isArray(rows) || rows.length !== 1) { fail(); }
	object(rows[0]);
	object(rows[0].catalog);
	array(rows[0].catalog.tables, (table) => {
		fields(table, { schema: "string", name: "string", rls: "boolean", forceRls: "boolean" });
		array(table.columns, (column) => {
			fields(column, { name: "string", ordinal: "number", type: "string", notNull: "boolean", default: "nullable" });
			if (!Number.isInteger(column.ordinal) || column.ordinal < 1) { fail(); }
		});
		array(table.constraints, (constraint) => {
			fields(constraint, { name: "string", kind: "string", definition: "string", targetSchema: "nullable", targetTable: "nullable" });
			strings(constraint.columns);
			strings(constraint.targetColumns);
			if (constraint.kind === "f" && (!constraint.targetSchema || !constraint.targetTable || !constraint.columns.length || constraint.columns.length !== constraint.targetColumns.length)) { fail(); }
		});
		array(table.indexes, (index) => fields(index, { name: "string", definition: "string" }));
		array(table.policies, (policy) => {
			fields(policy, { name: "string", command: "string", permissive: "boolean", using: "nullable", check: "nullable" });
			strings(policy.roles);
		});
		array(table.triggers, (trigger) => {
			fields(trigger, { name: "string", enabled: "string", timing: "string", orientation: "string", functionSchema: "string", functionName: "string" });
			strings(trigger.events);
			if (!["BEFORE", "AFTER", "INSTEAD OF"].includes(trigger.timing) || !["ROW", "STATEMENT"].includes(trigger.orientation) || !trigger.events.length || trigger.events.some((event) => !["INSERT", "DELETE", "UPDATE", "TRUNCATE"].includes(event))) { fail(); }
		});
	});
	array(functions, (entry) => fields(entry, { name: "string", status: "string" }));
};
