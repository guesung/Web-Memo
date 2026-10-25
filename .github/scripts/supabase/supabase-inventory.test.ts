import { describe, expect, it, vi } from "vitest";
import { buildInventory, collectSupabaseInventory, renderInventoryMarkdown } from "./supabase-inventory.mjs";

const getRows = () => ({
	schemaRows: [{ schema: "memo" }, { schema: "billing" }, { schema: "auth" }, { schema: "graphql" }],
	columnRows: [
		{ schema: "memo", table: "memo", column: "title", type: "text", position: 2 },
		{ schema: "memo", table: "memo", column: "id", type: "bigint", position: 1 },
		{ schema: "billing", table: "charges", column: "status", type: "billing.charge_status", position: 1 },
		{ schema: "memo", table: "empty", column: null, type: null, position: null },
		{ schema: "auth", table: "users", column: "id", type: "uuid", position: 1 },
	],
	functionRows: [
		{ schema: "memo", name: "get_stats", arguments: "only_active boolean", result: "json" },
		{ schema: "memo", name: "get_counts", arguments: "urls text[]", result: "TABLE(url text, count bigint)" },
	],
	edgeFunctionRows: [
		{ slug: "send-feedback", version: 5, status: "ACTIVE" },
		{ slug: "kakao-auth", version: 7, status: "ACTIVE" },
	],
});

const createFetcher = (override?: (url: URL, query: string) => Response | undefined) => {
	const rows = getRows();

	return vi.fn(async (input: string, options: RequestInit) => {
		const url = new URL(input);
		const query = options.body ? JSON.parse(String(options.body)).query : "";
		const overridden = override?.(url, query);

		if (overridden) {
			return overridden;
		}

		if (url.pathname.endsWith("/functions")) {
			return Response.json(rows.edgeFunctionRows);
		}

		if (query.includes("pg_get_function_result")) {
			return Response.json(rows.functionRows);
		}

		if (query.includes("pg_attribute")) {
			return Response.json(rows.columnRows);
		}

		return Response.json(rows.schemaRows);
	});
};

describe("collectSupabaseInventory", () => {
	it("읽기 전용 SQL과 함수 목록만 조회하고 행 데이터·secret은 요청하지 않는다", async () => {
		const fetcher = createFetcher();

		await collectSupabaseInventory({ token: "token", fetcher });

		const urls = fetcher.mock.calls.map(([input]) => new URL(input).pathname);

		expect(urls.every((path) => path.endsWith("/database/query/read-only") || path.endsWith("/functions"))).toBe(true);
		expect(urls.some((path) => path.endsWith("/secrets"))).toBe(false);
	});

	it("스키마를 이름으로 고정하지 않고 카탈로그에서 찾는다", async () => {
		const fetcher = createFetcher();

		await collectSupabaseInventory({ token: "token", fetcher });

		const queries = fetcher.mock.calls.map(([, options]) => (options.body ? JSON.parse(String(options.body)).query : ""));

		expect(queries.some((query) => query.includes("nspname in ('memo'"))).toBe(false);
	});

	it("조회가 하나라도 실패하면 빈 목록 대신 예외를 던진다", async () => {
		const fetcher = createFetcher((url) => (url.pathname.endsWith("/functions") ? new Response("", { status: 500 }) : undefined));

		await expect(collectSupabaseInventory({ token: "token", fetcher })).rejects.toThrow("Edge Function 조회 실패: HTTP 500");
	});

	it("토큰이 없으면 조회하지 않고 실패한다", async () => {
		const fetcher = createFetcher();

		await expect(collectSupabaseInventory({ token: "", fetcher })).rejects.toThrow("SUPABASE_ACCESS_TOKEN");
		expect(fetcher).not.toHaveBeenCalled();
	});
});

describe("buildInventory", () => {
	it("응답 형식이 어긋나면 예외를 던진다", () => {
		const rows = getRows();

		expect(() => buildInventory({ ...rows, edgeFunctionRows: [{ slug: "send-feedback", version: "5" }] })).toThrow("Edge Function 응답 형식");
	});

	it("앱 스키마의 테이블이 하나도 없으면 조회 오류로 보고 예외를 던진다", () => {
		const rows = getRows();

		expect(() => buildInventory({ ...rows, columnRows: rows.columnRows.filter((row) => row.schema === "auth") })).toThrow("앱 스키마의 테이블");
	});

	it("스키마 목록에 없는 스키마의 객체가 오면 예외를 던진다", () => {
		const rows = getRows();

		expect(() => buildInventory({ ...rows, functionRows: [{ schema: "unknown", name: "f", arguments: "", result: "void" }] })).toThrow("unknown");
	});
});

describe("renderInventoryMarkdown", () => {
	it("새 스키마를 앱 스키마로, Supabase 관리 스키마를 별도 구역으로 나눈다", () => {
		const markdown = renderInventoryMarkdown(buildInventory(getRows()));
		const managedIndex = markdown.indexOf("## Supabase 관리 스키마");

		expect(markdown.indexOf("### `billing`")).toBeLessThan(managedIndex);
		expect(markdown.indexOf("### `memo`")).toBeLessThan(managedIndex);
		expect(markdown.indexOf("### `auth`")).toBeGreaterThan(managedIndex);
		expect(markdown.indexOf("### `graphql`")).toBeGreaterThan(managedIndex);
	});

	it("컬럼은 정의 순서로, 테이블·함수·Edge Function은 이름순으로 싣는다", () => {
		const markdown = renderInventoryMarkdown(buildInventory(getRows()));

		expect(markdown.indexOf("| `id` | `bigint` |")).toBeLessThan(markdown.indexOf("| `title` | `text` |"));
		expect(markdown.indexOf("`memo.empty`")).toBeLessThan(markdown.indexOf("`memo.memo`"));
		expect(markdown.indexOf("get_counts")).toBeLessThan(markdown.indexOf("get_stats"));
		expect(markdown.indexOf("`kakao-auth` | 7")).toBeLessThan(markdown.indexOf("`send-feedback` | 5"));
	});

	it("조회 순서가 달라도 같은 문서를 만든다", () => {
		const rows = getRows();
		const reversed = {
			schemaRows: [...rows.schemaRows].reverse(),
			columnRows: [...rows.columnRows].reverse(),
			functionRows: [...rows.functionRows].reverse(),
			edgeFunctionRows: [...rows.edgeFunctionRows].reverse(),
		};

		expect(renderInventoryMarkdown(buildInventory(reversed))).toBe(renderInventoryMarkdown(buildInventory(rows)));
	});

	it("Edge Function 상태처럼 수시로 바뀌는 값과 조회 시각은 싣지 않는다", () => {
		const markdown = renderInventoryMarkdown(buildInventory(getRows()));

		expect(markdown).not.toContain("ACTIVE");
		expect(markdown).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
	});

	it("배포 버전이 Runtime 버전이 아니라는 한계를 명시한다", () => {
		const markdown = renderInventoryMarkdown(buildInventory(getRows()));

		expect(markdown).toContain("Edge Runtime이나 Deno 버전이 아닙니다");
	});

	it("표 구분자가 든 타입도 표를 깨뜨리지 않는다", () => {
		const rows = getRows();
		const markdown = renderInventoryMarkdown(
			buildInventory({ ...rows, functionRows: [{ schema: "memo", name: "f", arguments: "a text", result: "text|null" }] }),
		);

		expect(markdown).toContain("`text\\|null`");
	});
});
