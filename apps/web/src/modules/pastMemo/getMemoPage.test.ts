import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	createClient: vi.fn(),
	from: vi.fn(),
	select: vi.fn(),
	eq: vi.fn(),
	is: vi.fn(),
	order: vi.fn(),
	range: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

const { getMemoPage } = await import("./getMemoPage");

beforeEach(() => {
	vi.resetAllMocks();
	mocks.createClient.mockReturnValue(mocks);
	mocks.from.mockReturnValue(mocks);
	mocks.select.mockReturnValue(mocks);
	mocks.eq.mockReturnValue(mocks);
	mocks.is.mockReturnValue(mocks);
	mocks.order.mockReturnValue(mocks);
});

describe("getMemoPage", () => {
	it("사용자 토큰과 비삭제 필터로 최소 필드만 조회하고 페이지 경계를 포함한다", async () => {
		const memo = {
			id: 42,
			title: "제목",
			url: "https://blog.com",
			favIconUrl: null,
			updated_at: null,
		};
		mocks.range.mockResolvedValue({ data: [memo], error: null });

		const result = await getMemoPage({
			accessToken: "user-token",
			userId: "owner",
			offset: 200,
			pageSize: 200,
		});

		expect(result).toEqual([memo]);
		expect(mocks.createClient).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(String),
			{
				global: { headers: { Authorization: "Bearer user-token" } },
				db: { schema: "memo" },
				auth: { persistSession: false, autoRefreshToken: false },
			},
		);
		expect(mocks.from).toHaveBeenCalledWith("memo");
		expect(mocks.select).toHaveBeenCalledWith(
			"id,title,url,favIconUrl,updated_at",
		);
		expect(mocks.eq).toHaveBeenCalledWith("user_id", "owner");
		expect(mocks.is).toHaveBeenCalledWith("deleted_at", null);
		expect(mocks.order.mock.calls).toEqual([
			["updated_at", { ascending: false, nullsFirst: false }],
			["id", { ascending: false }],
		]);
		expect(mocks.range).toHaveBeenCalledWith(200, 399);
	});

	it("조회 오류를 상위 fail-open 처리로 전달한다", async () => {
		const error = new Error("query failed");
		mocks.range.mockResolvedValue({ data: null, error });

		await expect(
			getMemoPage({
				accessToken: "token",
				userId: "owner",
				offset: 0,
				pageSize: 200,
			}),
		).rejects.toBe(error);
	});
});
