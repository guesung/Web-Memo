import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSchema } from "../generate-supabase-schema.mjs";
import { CATALOG_QUERY, fetchSchemaDocument, renderSchemaDocument } from "./supabase-schema.mjs";

const createTable = (overrides: Record<string, unknown> = {}) => ({
	schema: "memo", name: "notes", rls: true, forceRls: false,
	columns: [
		{ name: "owner", ordinal: 2, type: "uuid", notNull: false, default: null },
		{ name: "id", ordinal: 1, type: "bigint", notNull: true, default: "nextval('memo.notes_seq'::regclass)" },
	],
	constraints: [
		{ name: "notes_pk", kind: "p", columns: ["id", "owner"], definition: "PRIMARY KEY (id, owner)", targetSchema: null, targetTable: null, targetColumns: [] },
		{ name: "notes_owner", kind: "f", columns: ["owner", "id"], definition: "FOREIGN KEY (owner, id) REFERENCES auth.users (id, tenant)", targetSchema: "auth", targetTable: "users", targetColumns: ["id", "tenant"] },
	],
	indexes: [{ name: "notes_index", definition: "CREATE INDEX notes_index ON memo.notes (id)" }],
	policies: [{ name: "owner_policy", command: "r", permissive: true, roles: ["authenticated", "anon"], using: "(auth.uid() = owner)", check: null }],
	triggers: [{ name: "notes_trigger", enabled: "O", timing: "AFTER", events: ["INSERT"], orientation: "ROW", functionSchema: "public", functionName: "notify" }],
	...overrides,
});

const mockApi = (catalog: unknown = { tables: [createTable()] }, functions: unknown = [{ name: "send-feedback", status: "ACTIVE" }]) => {
	const fetchMock = vi.fn()
		.mockResolvedValueOnce(new Response(JSON.stringify([{ catalog }]), { status: 201 }))
		.mockResolvedValueOnce(new Response(JSON.stringify(functions), { status: 200 }));
	vi.stubGlobal("fetch", fetchMock);

	return fetchMock;
};

const directories: string[] = [];
const createOutput = async () => {
	const directory = await mkdtemp(join(tmpdir(), "supabase-schema-test-"));
	directories.push(directory);

	return join(directory, "schema.md");
};

afterEach(async () => {
	vi.unstubAllGlobals();
	for (const directory of directories.splice(0)) {
		await rm(directory, { recursive: true, force: true });
	}
});

describe("Production API 계약", () => {
	it("읽기 전용 POST 201과 functions GET 200을 사용한다", async () => {
		const fetchMock = mockApi();
		await fetchSchemaDocument("test-token");
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[0][0]).toBe("https://api.supabase.com/v1/projects/czwtqukymcqoberdoltq/database/query/read-only");
		expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", headers: { Authorization: "Bearer test-token" } });
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ query: CATALOG_QUERY, parameters: [] });
		expect(fetchMock.mock.calls[1][0]).toBe("https://api.supabase.com/v1/projects/czwtqukymcqoberdoltq/functions");
		expect(CATALOG_QUERY).toContain("NOT trigger.tgisinternal");
		expect(CATALOG_QUERY).not.toMatch(/pg_get_triggerdef|tgargs|pg_get_function_identity_arguments/);
		expect(CATALOG_QUERY).toContain("ns.nspname IN ('feedback', 'memo')");
		expect(CATALOG_QUERY).toContain("ORDER BY key.ordinality");
		expect(CATALOG_QUERY).not.toMatch(/\b(?:FROM|JOIN)\s+(?:pg_|information_schema)(?!catalog\.)/i);
	});
	it("토큰 누락은 요청 전에 실패한다", async () => {
		const fetchMock = mockApi();
		await expect(fetchSchemaDocument(" ")).rejects.toThrow("SUPABASE_ACCESS_TOKEN");
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it.each([0, 1])("API %i 실패 시 반사된 토큰과 서버 본문을 노출하지 않는다", async (failedIndex) => {
		const fetchMock = vi.fn(async (url: string) => {
			if (url.endsWith(failedIndex === 0 ? "read-only" : "functions")) {
				return new Response("test-secret-token confidential", { status: 403 });
			}

			return new Response(JSON.stringify(url.endsWith("functions") ? [] : [{ catalog: { tables: [] } }]));
		});
		vi.stubGlobal("fetch", fetchMock);
		await expect(fetchSchemaDocument("test-secret-token")).rejects.toThrow("메타데이터 조회에 실패");
		await expect(fetchSchemaDocument("test-secret-token")).rejects.not.toThrow("test-secret-token");
	});
	it.each([
		{}, { tables: null }, { tables: [{ ...createTable(), rls: "true" }] },
		{ tables: [{ ...createTable(), columns: [{ name: "id", ordinal: 0 }] }] },
		{ tables: [{ ...createTable(), triggers: [{ name: "bad" }] }] },
		{ tables: [{ ...createTable(), policies: [{ name: "bad" }] }] },
		{ tables: [{ ...createTable(), constraints: [{ ...createTable().constraints[1], targetColumns: [] }] }] },
	])("잘못된 catalog 구조를 거부한다: %j", async (catalog) => {
		mockApi(catalog);
		await expect(fetchSchemaDocument("token")).rejects.toThrow("응답 구조");
	});
	it.each([null, {}, [{ name: "function" }], [{ name: 1, status: "ACTIVE" }]])("잘못된 functions 구조를 거부한다: %j", async (functions) => {
		mockApi({ tables: [] }, functions);
		await expect(fetchSchemaDocument("token")).rejects.toThrow("응답 구조");
	});
	it("카탈로그 row envelope가 달라도 실패한다", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => new Response("[]")));
		await expect(fetchSchemaDocument("token")).rejects.toThrow("응답 구조");
	});
});

describe("결정론적 Markdown", () => {
	it("트리거 정의와 인자에 포함된 HTTP 헤더·JWT·임의 시크릿을 출력하지 않는다", async () => {
		const secret = "arbitrary-sensitive-value";
		const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature";
		const trigger = {
			...createTable().triggers[0],
			events: ["UPDATE", "INSERT"],
			definition: `CREATE TRIGGER hook EXECUTE FUNCTION supabase_functions.http_request('https://example.test', 'POST', '{"Authorization":"Bearer ${jwt}","x-api-key":"${secret}"}')`,
			functionArguments: `Authorization Bearer ${jwt} ${secret}`,
			tgargs: secret,
		};
		mockApi({ tables: [createTable({ triggers: [trigger] })] }, []);
		const document = await fetchSchemaDocument("token");
		for (const forbidden of ["Authorization", "Bearer", jwt, secret, "http_request", "example.test", "x-api-key"]) {
			expect(document).not.toContain(forbidden);
		}
		expect(document).toContain("| AFTER | INSERT, UPDATE | ROW | public.notify() |");
	});
	it("컬럼·제약·인덱스·RLS·정책·트리거·배포 함수를 렌더링한다", async () => {
		mockApi();
		const document = await fetchSchemaDocument("token");
		for (const text of ["bigint", "PRIMARY KEY", "CREATE INDEX", "RLS: true / FORCE RLS: false", "auth.uid()", "public.notify()", "send-feedback", "ACTIVE", "외부 참조(세부 제외)", "auth.users (id, tenant)"]) {
			expect(document).toContain(text);
		}
		expect(document.indexOf("| 1 | id")).toBeLessThan(document.indexOf("| 2 | owner"));
		expect(document).toContain("owner, id");
		expect(document.split("```mermaid")[1].split("```")[0]).not.toContain("auth.users");
		expect(document).not.toContain("\r");
		expect(document).toMatch(/[^\n]\n$/);
	});
	it("응답 순서와 무관하며 시간·버전 필드는 무시한다", () => {
		const first = createTable();
		const second = createTable({ schema: "feedback", name: "feedbacks" });
		const functions = [{ name: "z", status: "ACTIVE", version: 1 }, { name: "a", status: "ACTIVE" }];
		const original = renderSchemaDocument({ tables: [first, second] }, functions);
		const shuffled = { ...first, columns: [...first.columns].reverse(), constraints: [...first.constraints].reverse(), policies: first.policies.map((policy) => ({ ...policy, roles: [...policy.roles].reverse() })) };
		expect(renderSchemaDocument({ tables: [second, shuffled] }, [...functions].reverse().map((entry) => ({ ...entry, version: 99, updated_at: "tomorrow" })))).toBe(original);
	});
	it("내부 FK만 ERD에 연결하고 외부 테이블의 트리거는 제외한다", () => {
		const table = createTable({ constraints: [{ ...createTable().constraints[1], targetSchema: "feedback", targetTable: "feedbacks" }] });
		const document = renderSchemaDocument({ tables: [table, createTable({ schema: "feedback", name: "feedbacks", constraints: [] }), createTable({ schema: "auth", name: "secret", triggers: [{ name: "outside-secret" }] })] }, []);
		expect(document).toContain("table_0 }o..o{ table_1");
		expect(document).not.toContain("outside-secret");
		expect(document).not.toContain("auth.secret");
	});
	it("Markdown과 Mermaid에 삽입되는 특수 문자를 이스케이프한다", () => {
		const document = renderSchemaDocument({ tables: [createTable({ name: 'bad"`|<tag>\n[]', columns: [{ name: "unsafe|column", ordinal: 1, type: "text", notNull: false, default: "a\r\nb\\c`*_" }] })] }, []);
		expect(document).toContain("unsafe&#124;column");
		expect(document).toContain("a<br>b&#92;c&#96;&#42;&#95;");
		expect(document).toContain("#34;#96;#124;#60;tag#62;#10;#91;#93;");
		expect(document).not.toContain("<tag>");
	});
	it("빈 컬렉션은 없음으로 표시한다", () => {
		expect(renderSchemaDocument({ tables: [] }, [])).toContain("## ERD\n\n없음");
		const emptyTable = createTable({ columns: [], constraints: [], indexes: [], policies: [], triggers: [] });
		const document = renderSchemaDocument({ tables: [emptyTable] }, []);
		for (const title of ["컬럼", "제약", "인덱스", "정책", "트리거", "배포 Edge Functions"]) {
			expect(document).toContain(`${title}\n\n없음`);
		}
	});
});

describe("원자적 파일 생성과 --check", () => {
	it("성공한 문서를 교체하고 임시 파일을 정리한다", async () => {
		const outputPath = await createOutput();
		await writeFile(outputPath, "original");
		mockApi();
		await generateSchema({ token: "token", outputPath });
		expect(await readFile(outputPath, "utf8")).toContain("# Supabase 스키마");
		expect(await readdir(directories[0])).toEqual(["schema.md"]);
	});
	it.each(["missing", "different", "crlf", "extra-newline"])("check는 %s에서 실패하고 원본을 보존한다", async (variant) => {
		const outputPath = await createOutput();
		const expected = renderSchemaDocument({ tables: [] }, []);
		const content = variant === "crlf" ? expected.replaceAll("\n", "\r\n") : variant === "extra-newline" ? `${expected}\n` : "old";
		if (variant !== "missing") { await writeFile(outputPath, content); }
		mockApi({ tables: [] }, []);
		await expect(generateSchema({ token: "token", outputPath, check: true })).rejects.toThrow("pnpm generate-supabase-schema");
		if (variant === "missing") {
			await expect(readFile(outputPath)).rejects.toMatchObject({ code: "ENOENT" });
		} else {
			expect(await readFile(outputPath, "utf8")).toBe(content);
		}
	});
	it("check는 정확히 같은 바이트만 통과한다", async () => {
		const outputPath = await createOutput();
		await writeFile(outputPath, renderSchemaDocument({ tables: [] }, []));
		mockApi({ tables: [] }, []);
		await expect(generateSchema({ token: "token", outputPath, check: true })).resolves.toBeUndefined();
	});
	it.each(["catalog", "functions", "network"])("%s 실패 시 기존 문서를 보존한다", async (failure) => {
		const outputPath = await createOutput();
		await writeFile(outputPath, "original bytes\r\n");
		if (failure === "network") {
			vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("token")));
		} else {
			mockApi(failure === "catalog" ? {} : { tables: [] }, failure === "functions" ? {} : []);
		}
		await expect(generateSchema({ token: "token", outputPath })).rejects.toThrow();
		expect(await readFile(outputPath, "utf8")).toBe("original bytes\r\n");
		expect(await readdir(directories[0])).toEqual(["schema.md"]);
	});
});
