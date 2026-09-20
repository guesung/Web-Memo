import { afterEach, describe, expect, it, vi } from "vitest";

import {
	compareRegistry,
	fetchGithubSecretNames,
	fetchVercelEnvNames,
	formatFindingLine,
	formatFindings,
	tryFetch,
} from "./env-registry.mjs";

const entry = (overrides: Record<string, unknown> = {}) => ({
	name: "SAMPLE_KEY",
	kind: "secret",
	stores: ["github"],
	consumers: [],
	impact: "x",
	note: "",
	required: true,
	...overrides,
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("compareRegistry", () => {
	it("github: 등록이 빠진 값과 매니페스트에 없는 값을 각각 알린다", () => {
		const { findings } = compareRegistry({
			entries: [entry(), entry({ name: "OPT", required: false })],
			results: [{ store: "github", names: new Set(["STRAY"]) }],
		});

		expect(findings).toEqual([
			{ store: "github", type: "missing", name: "SAMPLE_KEY" },
			{ store: "github", type: "unregistered", name: "STRAY" },
		]);
	});

	it("supabase: 플랫폼 예약 변수(SUPABASE_*)는 무시하고 나머지 미등록은 알린다", () => {
		const { findings } = compareRegistry({
			entries: [entry({ name: "CRON_SECRET", stores: ["supabase"] })],
			results: [
				{
					store: "supabase",
					names: new Set(["CRON_SECRET", "SUPABASE_URL", "SUPABASE_DB_URL", "STRAY"]),
				},
			],
		});

		expect(findings).toEqual([{ store: "supabase", type: "unregistered", name: "STRAY" }]);
	});

	it("vercel: 환경별로 빠진 것, 선언 밖 환경, 미등록, 잘못 등록된 platform 값을 가른다", () => {
		const { findings } = compareRegistry({
			entries: [
				entry({
					name: "OPENAI_API_KEY",
					stores: ["vercel:production", "vercel:preview", "vercel:development"],
				}),
				entry({ name: "SENTRY_AUTH_TOKEN", stores: ["vercel:production"] }),
				entry({ name: "SUPABASE_SERVICE_ROLE_KEY", kind: "platform", stores: [] }),
			],
			results: [
				{
					store: "vercel",
					names: new Map([
						["OPENAI_API_KEY", new Set(["production"])],
						["SENTRY_AUTH_TOKEN", new Set(["production", "development"])],
						["SUPABASE_SERVICE_ROLE_KEY", new Set(["preview"])],
						["STRAY", new Set(["production"])],
					]),
				},
			],
		});

		expect(findings).toEqual(
			expect.arrayContaining([
				{ store: "vercel", type: "missing", name: "OPENAI_API_KEY", detail: "preview" },
				{ store: "vercel", type: "missing", name: "OPENAI_API_KEY", detail: "development" },
				{ store: "vercel", type: "extra-environment", name: "SENTRY_AUTH_TOKEN", detail: "development" },
				{ store: "vercel", type: "unregistered", name: "SUPABASE_SERVICE_ROLE_KEY" },
				{ store: "vercel", type: "unregistered", name: "STRAY" },
			]),
		);
		expect(findings).toHaveLength(5);
	});

	it("조회하지 못한 저장소는 실패가 아니라 미조회로 남기고 나머지는 대조한다", () => {
		const { findings, skipped } = compareRegistry({
			entries: [entry()],
			results: [
				{ store: "vercel", skipped: "VERCEL_TOKEN 없음" },
				{ store: "github", names: new Set(["SAMPLE_KEY"]) },
			],
		});

		expect(skipped).toEqual([{ store: "vercel", reason: "VERCEL_TOKEN 없음" }]);
		expect(findings).toEqual([]);
	});
});

describe("formatFindings", () => {
	it("차이가 없으면 알릴 것이 없으므로 null이다", () => {
		expect(formatFindings({ findings: [], skipped: [], runUrl: null })).toBeNull();
	});

	it("저장소별로 묶고 미조회 사유와 로그 링크를 붙인다", () => {
		const message = formatFindings({
			findings: [
				{ store: "vercel", type: "missing", name: "UPSTASH_REDIS_REST_URL", detail: "production" },
				{ store: "supabase", type: "missing", name: "SLACK_SIGNUP_WEBHOOK_URL" },
			],
			skipped: [{ store: "github", reason: "GH_AUDIT_TOKEN 없음" }],
			runUrl: "https://github.com/x/actions/runs/1",
		});

		expect(message).toContain("(2건)");
		expect(message).toContain("*Vercel*");
		expect(message).toContain("`UPSTASH_REDIS_REST_URL` (production)");
		expect(message).toContain("*Supabase*");
		expect(message).toContain("GitHub Secrets(GH_AUDIT_TOKEN 없음)");
		expect(message).toContain("<https://github.com/x/actions/runs/1|실행 로그 보기>");
	});
});

describe("formatFindingLine", () => {
	it("Slack 목록과 PR 경고 주석이 같은 문장을 쓰도록 종류와 환경을 한 줄로 쓴다", () => {
		expect(
			formatFindingLine({ store: "vercel", type: "missing", name: "A", detail: "preview" }),
		).toBe("등록 안 됨: `A` (preview)");
		expect(formatFindingLine({ store: "github", type: "unregistered", name: "B" })).toBe(
			"매니페스트에 없음: `B`",
		);
	});
});

describe("tryFetch", () => {
	it("토큰이 없으면 호출하지 않고 미조회로 돌려준다", async () => {
		const fetcher = vi.fn();

		expect(
			await tryFetch({ store: "supabase", tokenName: "SUPABASE_ACCESS_TOKEN", token: undefined, fetcher }),
		).toEqual({ store: "supabase", skipped: "SUPABASE_ACCESS_TOKEN 없음" });
		expect(fetcher).not.toHaveBeenCalled();
	});

	it("조회가 거절되면 던지지 않고 사유를 남긴다", async () => {
		const result = await tryFetch({
			store: "github",
			tokenName: "GH_AUDIT_TOKEN",
			token: "t",
			fetcher: async () => {
				throw new Error("403 https://api.github.com/x — Resource not accessible");
			},
		});

		expect(result.skipped).toContain("403");
	});
});

describe("조회 함수는 이름과 환경만 남긴다", () => {
	it("vercel: 값이 담긴 응답에서 이름·환경만 골라 담고 문자열·배열 target을 모두 받는다", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				Response.json({
					envs: [
						{ key: "A", target: ["production", "preview"], value: "SECRET-VALUE-1" },
						{ key: "A", target: "development", value: "SECRET-VALUE-2" },
						{ key: "B", target: ["production"], type: "sensitive" },
					],
				}),
			),
		);

		const names = await fetchVercelEnvNames({ project: "p", teamSlug: "t", token: "x" });

		expect([...names.get("A")!].sort()).toEqual(["development", "preview", "production"]);
		expect([...names.get("B")!]).toEqual(["production"]);
		expect(JSON.stringify([...names])).not.toContain("SECRET-VALUE");
	});

	it("github: 여러 페이지를 이어 받는다", async () => {
		const pages = [
			{ total_count: 3, secrets: [{ name: "A" }, { name: "B" }] },
			{ total_count: 3, secrets: [{ name: "C" }] },
		];
		let call = 0;

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => Response.json(pages[call++])),
		);

		expect([...(await fetchGithubSecretNames({ repository: "o/r", token: "x" }))]).toEqual(["A", "B", "C"]);
	});
});
