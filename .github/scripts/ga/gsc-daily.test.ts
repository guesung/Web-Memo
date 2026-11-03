// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it, vi } from "vitest";

vi.mock("../shared/google-auth.mjs", () => ({
	exchangeServiceAccountToken: vi.fn(async () => "token"),
}));

import { fetchTopSearchQueries } from "./gsc-daily.mjs";

const now = new Date("2026-11-02T00:00:00Z");
const serviceAccountJson = JSON.stringify({ client_email: "a@b.c" });
const sleep = async () => {};

const jsonResponse = (body, status = 200) => ({
	ok: status < 400,
	status,
	json: async () => body,
});

describe("fetchTopSearchQueries", () => {
	it("자격 증명이 없으면 호출 없이 skipped", async () => {
		const fetcher = vi.fn();

		expect(await fetchTopSearchQueries({ now, fetcher, sleep })).toEqual({
			status: "skipped",
		});
		expect(fetcher).not.toHaveBeenCalled();
	});

	it("최근 확정 7일 기간으로 질의하고 행을 정리한다", async () => {
		const fetcher = vi.fn(async () =>
			jsonResponse({
				rows: [{ keys: ["web memo"], clicks: 10, impressions: 100 }],
			}),
		);

		const result = await fetchTopSearchQueries({
			serviceAccountJson,
			now,
			fetcher,
			sleep,
		});
		const body = JSON.parse(fetcher.mock.calls[0][1].body);

		expect(body).toEqual({
			startDate: "2026-10-23",
			endDate: "2026-10-29",
			dimensions: ["query"],
			rowLimit: 5,
			dataState: "final",
		});
		expect(result).toEqual({
			status: "ok",
			startDate: "2026-10-23",
			endDate: "2026-10-29",
			queries: [{ query: "web memo", clicks: 10, impressions: 100 }],
		});
	});

	it("행이 없으면 빈 queries 로 ok", async () => {
		const result = await fetchTopSearchQueries({
			serviceAccountJson,
			now,
			fetcher: async () => jsonResponse({}),
			sleep,
		});

		expect(result.status).toBe("ok");
		expect(result.queries).toEqual([]);
	});

	it("요청이 실패하면 메시지만 warn 하고 failed", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const result = await fetchTopSearchQueries({
			serviceAccountJson,
			now,
			fetcher: async () => jsonResponse({}, 403),
			sleep,
		});

		expect(result).toEqual({ status: "failed" });
		expect(warn.mock.calls[0][0]).toContain("Search Console 조회 권한이 없습니다.");
		warn.mockRestore();
	});

	it("잘못된 JSON 도 failed 로 삼킨다", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		expect(
			await fetchTopSearchQueries({ serviceAccountJson: "{", now, sleep }),
		).toEqual({ status: "failed" });
		warn.mockRestore();
	});
});
