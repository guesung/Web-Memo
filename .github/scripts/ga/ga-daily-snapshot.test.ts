// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ACTIVE_USERS_FILTER,
	ACTIVE_USERS_METRIC,
	buildActiveUsersSnapshotRows,
	buildEventSnapshotRows,
	fetchSnapshotRows,
	resolveDailyRange,
	upsertSnapshotRows,
} from "./ga-daily-snapshot.mjs";

afterEach(() => {
	vi.unstubAllGlobals();
});

const gaResponse = (rows, rowCount = rows.length) => ({
	ok: true,
	json: async () => ({
		rowCount,
		rows: rows.map(([dimensions, metrics]) => ({
			dimensionValues: dimensions.map((value) => ({ value })),
			metricValues: metrics.map((value) => ({ value: String(value) })),
		})),
	}),
});

describe("행 변환", () => {
	it("날짜×이벤트 행을 {date, metric, users, events} 로 바꾼다", () => {
		const rows = buildEventSnapshotRows([
			{ dimensions: ["20261118", "memo_write"], metrics: [12, 340] },
		]);

		expect(rows).toEqual([
			{ date: "2026-11-18", metric: "memo_write", users: 12, events: 340 },
		]);
	});

	it("활성 사용자 행은 metric 이 active_users 이고 events 가 null 이다", () => {
		const rows = buildActiveUsersSnapshotRows([
			{ dimensions: ["20261118"], metrics: [57] },
		]);

		expect(rows).toEqual([
			{ date: "2026-11-18", metric: ACTIVE_USERS_METRIC, users: 57, events: null },
		]);
	});

	it("활성 사용자 필터는 호스트 허용 목록(빈 문자열 포함)과 extension_installed 제외를 담는다", () => {
		const [host, notInstalled] = ACTIVE_USERS_FILTER.andGroup.expressions;
		const hostNames = host.orGroup.expressions.map(
			(expression) => expression.filter.stringFilter.value,
		);

		expect(hostNames).toContain("");
		expect(hostNames).toContain("www.webmemo.xyz");
		expect(notInstalled.notExpression.filter.stringFilter.value).toBe(
			"extension_installed",
		);
	});
});

describe("기간", () => {
	it("데일리는 대상일 포함 8일치다", () => {
		expect(resolveDailyRange("2026-11-18")).toEqual({
			startDate: "2026-11-11",
			endDate: "2026-11-18",
		});
	});
});

describe("fetchSnapshotRows", () => {
	it("이벤트 행과 active_users 행을 한 목록으로 합친다", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				gaResponse([[["20261118", "memo_write"], [3, 9]]]),
			)
			.mockResolvedValueOnce(gaResponse([[["20261118"], [5]]]));

		vi.stubGlobal("fetch", fetchMock);

		const rows = await fetchSnapshotRows({
			accessToken: "token",
			propertyId: "1",
			startDate: "2026-11-18",
			endDate: "2026-11-18",
		});

		expect(rows).toEqual([
			{ date: "2026-11-18", metric: "memo_write", users: 3, events: 9 },
			{ date: "2026-11-18", metric: "active_users", users: 5, events: null },
		]);
	});

	it("rowCount 가 한 페이지보다 크면 offset 을 옮겨 이어서 읽는다", async () => {
		const makeRows = (count, prefix) =>
			Array.from({ length: count }, (_, index) => [
				["20261118", `${prefix}${index}`],
				[1, 1],
			]);
		// 이벤트 조회와 활성 사용자 조회가 병렬이라 호출 순서가 아니라 요청 본문으로 갈라 응답합니다.
		const fetchMock = vi.fn(async (_url, options) => {
			const body = JSON.parse(options.body);

			if (body.dimensions.length === 1) return gaResponse([]);

			return body.offset === 0
				? gaResponse(makeRows(10000, "a"), 10001)
				: gaResponse(makeRows(1, "b"), 10001);
		});

		vi.stubGlobal("fetch", fetchMock);

		const rows = await fetchSnapshotRows({
			accessToken: "token",
			propertyId: "1",
			startDate: "2026-11-18",
			endDate: "2026-11-18",
		});
		const eventOffsets = fetchMock.mock.calls
			.map(([, options]) => JSON.parse(options.body))
			.filter((body) => body.dimensions.length === 2)
			.map((body) => body.offset);

		expect(rows).toHaveLength(10001);
		expect(eventOffsets).toEqual([0, 10000]);
	});
});

describe("upsertSnapshotRows", () => {
	const rows = [
		{ date: "2026-11-18", metric: "memo_write", users: 3, events: 9 },
		{ date: "2026-11-18", metric: "active_users", users: 5, events: null },
	];

	it("memo 스키마의 ga_daily_metrics 로 merge-duplicates upsert 한다", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true });

		vi.stubGlobal("fetch", fetchMock);

		const count = await upsertSnapshotRows({
			supabaseUrl: "https://example.supabase.co",
			serviceRoleKey: "service-key",
			rows,
		});
		const [url, options] = fetchMock.mock.calls[0];

		expect(count).toBe(2);
		expect(url).toBe(
			"https://example.supabase.co/rest/v1/ga_daily_metrics?on_conflict=date,metric",
		);
		expect(options.method).toBe("POST");
		expect(options.headers["content-profile"]).toBe("memo");
		expect(options.headers.prefer).toContain("resolution=merge-duplicates");
		expect(options.headers.authorization).toBe("Bearer service-key");
		expect(JSON.parse(options.body)).toEqual([
			expect.objectContaining(rows[0]),
			expect.objectContaining(rows[1]),
		]);
	});

	it("1000행을 넘으면 나눠 보낸다", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true });

		vi.stubGlobal("fetch", fetchMock);

		await upsertSnapshotRows({
			supabaseUrl: "https://example.supabase.co",
			serviceRoleKey: "k",
			rows: Array.from({ length: 2500 }, (_, index) => ({
				date: "2026-11-18",
				metric: `m${index}`,
				users: 1,
				events: 1,
			})),
		});

		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("실패하면 상태와 본문을 담아 던지고 다음 묶음을 보내지 않는다", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: false, status: 401, text: async () => "bad key" });

		vi.stubGlobal("fetch", fetchMock);

		await expect(
			upsertSnapshotRows({
				supabaseUrl: "https://example.supabase.co",
				serviceRoleKey: "k",
				rows: Array.from({ length: 1500 }, (_, index) => ({
					date: "2026-11-18",
					metric: `m${index}`,
					users: 1,
					events: 1,
				})),
			}),
		).rejects.toThrow("401");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
