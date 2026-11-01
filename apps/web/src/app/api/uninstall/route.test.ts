import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { config, afterTasks } = vi.hoisted(() => ({
	config: { buildEnv: "production" },
	afterTasks: [] as Array<() => unknown>,
}));

vi.mock("@web-memo/env", () => ({ CONFIG: config }));
vi.mock("next/server", async (importOriginal) => ({
	...(await importOriginal<typeof import("next/server")>()),
	after: (task: () => unknown) => {
		afterTasks.push(task);
	},
}));

import { GET, HEAD } from "./route";

const requestWith = (search = "", headers?: HeadersInit) =>
	new NextRequest(`https://webmemo.example/api/uninstall${search}`, {
		headers,
	});

/** `after()`로 예약된 작업을 응답 뒤에 실행된 것처럼 돌립니다. */
const runAfterTasks = async () => {
	for (const task of afterTasks.splice(0)) await task();
};

const readEvent = () => {
	const [, options] = vi.mocked(fetch).mock.calls[0];
	return JSON.parse(options?.body as string) as {
		client_id: string;
		events: Array<{ name: string; params: Record<string, unknown> }>;
	};
};

describe("GET /api/uninstall", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		afterTasks.length = 0;
		config.buildEnv = "production";
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, status: 204 }),
		);
	});

	it("GA 전송을 기다리지 않고 언어가 붙은 제거 페이지로 바로 이동한다", async () => {
		vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

		const response = GET(
			requestWith("?cid=550e8400-e29b-41d4-a716-446655440000"),
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe(
			"https://webmemo.example/en/uninstall",
		);
		expect(fetch).not.toHaveBeenCalled();
		expect(afterTasks).toHaveLength(1);
	});

	it("기존 UUID, 버전과 필수 파라미터를 응답 뒤에 GA로 보내고 쿼리 없는 제거 페이지로 이동한다", async () => {
		const clientId = "550e8400-e29b-41d4-a716-446655440000";
		const response = GET(
			requestWith(`?cid=${clientId}&v=1.2.3.4&token=sensitive`),
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe(
			"https://webmemo.example/en/uninstall",
		);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
		expect(response.headers.get("X-Robots-Tag")).toBe("noindex");

		await runAfterTasks();
		expect(fetch).toHaveBeenCalledOnce();

		const [url, options] = vi.mocked(fetch).mock.calls[0];
		expect((url as URL).origin).toBe("https://www.google-analytics.com");
		expect((url as URL).pathname).toBe("/mp/collect");
		expect((url as URL).searchParams.get("measurement_id")).toBeTruthy();
		expect((url as URL).searchParams.get("api_secret")).toBeTruthy();
		expect(options).toMatchObject({ method: "POST", cache: "no-store" });
		expect(options?.signal).toBeInstanceOf(AbortSignal);
		expect(readEvent()).toEqual({
			client_id: clientId,
			events: [
				{
					name: "extension_uninstall",
					params: {
						event_category: "engagement",
						engagement_time_msec: 100,
						session_id: expect.any(String),
						extension_version: "1.2.3.4",
						build_env: "production",
					},
				},
			],
		});
	});

	it.each([
		["언어 쿠키", { cookie: "i18next=ko" }],
		["Accept-Language", { "Accept-Language": "ko-KR,ko;q=0.9" }],
	])("%s로 미들웨어와 같은 언어를 고른다", (_, headers) => {
		const response = GET(requestWith("", headers));

		expect(response.headers.get("location")).toBe(
			"https://webmemo.example/ko/uninstall",
		);
	});

	it("기존 session ID는 유지하고 staging 디버그 모드를 켠다", async () => {
		config.buildEnv = "staging";
		GET(requestWith("?cid=session-1712345678901-a1b2c3d4e&v=2.0"));
		await runAfterTasks();

		expect(readEvent().client_id).toBe("session-1712345678901-a1b2c3d4e");
		expect(readEvent().events[0].params).toMatchObject({
			build_env: "staging",
			debug_mode: true,
		});
	});

	it("cid가 없거나 잘못되면 새 ID를 사용하고 잘못된 버전은 unknown으로 기록한다", async () => {
		GET(requestWith());
		await runAfterTasks();
		expect(readEvent().client_id).toMatch(/^[0-9a-f-]{36}$/);
		expect(readEvent().events[0].params.extension_version).toBe("unknown");

		vi.mocked(fetch).mockClear();
		GET(requestWith("?cid=private%40email.test&v=%3Cscript%3E"));
		await runAfterTasks();
		expect(readEvent().client_id).toMatch(/^[0-9a-f-]{36}$/);
		expect(readEvent().events[0].params.extension_version).toBe("unknown");
	});

	it.each(["rejected", "non-2xx", "timeout"])(
		"GA %s 시에도 리다이렉트하고 민감한 오류는 출력하지 않는다",
		async (failure) => {
			const secret = "sensitive-token";
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			if (failure === "non-2xx") {
				vi.mocked(fetch).mockResolvedValue({
					ok: false,
					status: 503,
				} as Response);
			} else if (failure === "timeout") {
				vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => {
					expect(milliseconds).toBe(2_000);
					return AbortSignal.abort();
				});
				vi.mocked(fetch).mockImplementation(async (_, options) => {
					expect(options?.signal?.aborted).toBe(true);
					throw new Error(secret);
				});
			} else {
				vi.mocked(fetch).mockRejectedValue(new Error(secret));
			}

			const response = GET(requestWith(`?cid=${secret}&v=1.0`));
			expect(response.status).toBe(302);
			expect(response.headers.get("location")).toBe(
				"https://webmemo.example/en/uninstall",
			);
			await expect(runAfterTasks()).resolves.toBeUndefined();
			expect(fetch).toHaveBeenCalledOnce();
			expect(JSON.stringify(warn.mock.calls)).not.toContain(secret);
		},
	);

	it("development에서는 GA를 호출하지 않는다", async () => {
		config.buildEnv = "development";
		const response = GET(requestWith("?cid=sensitive"));
		await runAfterTasks();

		expect(response.status).toBe(302);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("HEAD는 이벤트 없이 제거 페이지로 이동한다", () => {
		const response = HEAD(requestWith("?cid=sensitive"));

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe(
			"https://webmemo.example/en/uninstall",
		);
		expect(afterTasks).toHaveLength(0);
		expect(fetch).not.toHaveBeenCalled();
	});
});
