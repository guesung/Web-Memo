import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
	createClient: () => ({ rpc }),
}));

type THandler = (req: Request) => Promise<Response>;

const SECRET = "t".repeat(40);
const LEASE_TOKEN = "3f2b1c9e-8a4d-4c1e-9b7a-0d5e6f7a8b9c";

let handler: THandler;
let environment: Record<string, string | undefined>;

const call = ({
	body,
	secret = SECRET,
	method = "POST",
}: {
	body: unknown;
	secret?: string | null;
	method?: string;
}) => {
	const headers = new Headers({ "Content-Type": "application/json" });

	if (secret !== null) {
		headers.set("x-blog-catalog-ingest-secret", secret);
	}

	return handler(
		new Request("http://localhost/functions/v1/blog-catalog-ingest", {
			method,
			headers,
			body: method === "GET" ? undefined : typeof body === "string" ? body : JSON.stringify(body),
		}),
	);
};

beforeEach(async () => {
	rpc.mockReset();
	environment = {
		BLOG_CATALOG_INGEST_SECRET: SECRET,
		SUPABASE_URL: "http://localhost:54321",
		SUPABASE_SERVICE_ROLE_KEY: "service-role-placeholder",
	};

	vi.stubGlobal("Deno", {
		env: { get: (name: string) => environment[name] },
		serve: (registered: THandler) => {
			handler = registered;
		},
	});
	vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.resetModules();
	await import("./index");
});

describe("blog-catalog-ingest 핸들러", () => {
	it("POST가 아니면 405", async () => {
		const response = await call({ body: {}, method: "GET" });

		expect(response.status).toBe(405);
	});

	it("secret이 없거나 틀리면 401이고 DB를 부르지 않는다", async () => {
		const missing = await call({ body: { action: "claim" }, secret: null });
		const wrong = await call({ body: { action: "claim" }, secret: "x".repeat(40) });

		expect(missing.status).toBe(401);
		expect(wrong.status).toBe(401);
		expect(rpc).not.toHaveBeenCalled();
	});

	it("서버에 secret이 없거나 짧으면 500(설정 오류)이고 값이 응답에 없다", async () => {
		environment.BLOG_CATALOG_INGEST_SECRET = "short";

		const response = await call({ body: { action: "claim" }, secret: "short" });
		const text = await response.text();

		expect(response.status).toBe(500);
		expect(text).not.toContain("short");
	});

	it("깨진 JSON은 400, 스키마 위반도 400", async () => {
		const malformed = await call({ body: "{not json" });
		const invalid = await call({ body: { action: "claim", blogId: "velog", trigger: "daily" } });

		expect(malformed.status).toBe(400);
		expect(invalid.status).toBe(400);
		expect(rpc).not.toHaveBeenCalled();
	});

	it("claim은 RPC 결과를 그대로 200으로 돌려준다", async () => {
		rpc.mockResolvedValue({ data: { claimed: false, reason: "lease_active" }, error: null });

		const response = await call({ body: { action: "claim", blogId: "toss", trigger: "daily" } });

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ claimed: false, reason: "lease_active" });
		expect(rpc).toHaveBeenCalledWith("claim_blog_sync", {
			p_blog_id: "toss",
			p_trigger: "daily",
			p_force: false,
			p_lease_seconds: 1200,
		});
	});

	it("stale lease(PT409)는 409", async () => {
		rpc.mockResolvedValue({ data: null, error: { code: "PT409", message: "stale_lease" } });

		const response = await call({
			body: { action: "checkpoint", blogId: "toss", generation: 1, leaseToken: LEASE_TOKEN, checkpoint: { nextPage: 2 } },
		});

		expect(response.status).toBe(409);
		expect((await response.json()).code).toBe("stale_lease");
	});

	it("DB 검증 거절(22xxx)은 422, 롤백 사유를 돌려준다", async () => {
		rpc.mockResolvedValue({ data: null, error: { code: "22023", message: "count_mismatch" } });

		const response = await call({
			body: {
				action: "finish",
				blogId: "toss",
				generation: 1,
				leaseToken: LEASE_TOKEN,
				evidence: { kind: "toss", nextIsNull: true, reportedCount: 5, uniqueCount: 5, pageCount: 1 },
			},
		});

		expect(response.status).toBe(422);
		expect((await response.json()).message).toBe("count_mismatch");
	});

	it("알 수 없는 DB 오류는 내부 정보 없이 500", async () => {
		rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "relation memo.secret_table exploded" } });

		const response = await call({
			body: { action: "fail", blogId: "toss", generation: 1, leaseToken: LEASE_TOKEN, errorCode: "network" },
		});
		const text = await response.text();

		expect(response.status).toBe(500);
		expect(text).not.toContain("secret_table");
	});
});
