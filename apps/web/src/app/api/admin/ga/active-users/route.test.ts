import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, checkIsAdmin } = vi.hoisted(() => ({
	getUser: vi.fn(),
	checkIsAdmin: vi.fn(),
}));

vi.mock("@src/modules/supabase/util.server", () => ({
	getSupabaseClient: () => ({ auth: { getUser } }),
}));

vi.mock("@web-memo/shared/utils", () => ({
	AdminService: class {
		checkIsAdmin = checkIsAdmin;
	},
}));

// 캐시는 조회 결과를 재사용할 뿐 분기에 관여하지 않으므로 그대로 통과시킵니다.
vi.mock("next/cache", () => ({
	unstable_cache: <TArgs extends unknown[], TResult>(
		fn: (...args: TArgs) => TResult,
	) => fn,
}));

import { GET } from "./route";

const requestWith = (search = "") =>
	new NextRequest(
		`http://localhost/api/admin/ga/active-users${search}`,
	) as NextRequest;

describe("GET /api/admin/ga/active-users", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// 이 테스트가 도는 환경에는 GA4 크리덴셜이 없습니다. 그 상태가 곧 검증 대상입니다.
		expect(process.env.GA4_SERVICE_ACCOUNT_JSON).toBeUndefined();
	});

	it("로그인하지 않았으면 403으로 거절한다", async () => {
		getUser.mockResolvedValue({ data: { user: null } });

		const response = await GET(requestWith());

		expect(response.status).toBe(403);
		expect(checkIsAdmin).not.toHaveBeenCalled();
	});

	it("로그인했어도 관리자가 아니면 403으로 거절한다", async () => {
		getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
		checkIsAdmin.mockResolvedValue(false);

		const response = await GET(requestWith());

		expect(response.status).toBe(403);
	});

	it("days가 정수 범위를 벗어나면 400으로 거절한다", async () => {
		getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
		checkIsAdmin.mockResolvedValue(true);

		for (const search of ["?days=abc", "?days=0", "?days=366", "?days=1.5"]) {
			expect((await GET(requestWith(search))).status).toBe(400);
		}
	});

	/**
	 * 크리덴셜이 아직 없는 것은 조회 실패와 다른 상태입니다. 500을 던지면 화면이 에러
	 * 바운더리로 빠져 나머지 관리 지표까지 못 보게 되고, 빈 배열만 조용히 돌려주면
	 * "연결 없음"과 "정말 사용자가 없음"을 화면이 구분할 수 없습니다.
	 */
	it("관리자이지만 GA4 크리덴셜이 없으면 200과 connected:false를 돌려준다", async () => {
		getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
		checkIsAdmin.mockResolvedValue(true);

		const response = await GET(requestWith());

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			rows: [],
			asOf: null,
			connected: false,
		});
	});

	/**
	 * QA 재현 방법이 "환경 변수를 지우면 미연결, 값이 깨지면 조회 실패"로 못박혀 있습니다.
	 * 값이 깨졌는데 미연결로 떨어지면 두 상태를 가르는 의미가 없어집니다.
	 */
	it("크리덴셜 값이 깨져 있으면 미연결이 아니라 500으로 실패한다", async () => {
		getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
		checkIsAdmin.mockResolvedValue(true);

		// 환경 변수는 모듈 최상단에서 한 번만 읽으므로 모듈을 새로 평가해야 반영됩니다.
		vi.resetModules();
		vi.stubEnv("GA4_SERVICE_ACCOUNT_JSON", "{ 깨진 값");

		const { GET: getWithBrokenCredential } = await import("./route");
		const response = await getWithBrokenCredential(requestWith());

		expect(response.status).toBe(500);
		expect(await response.json()).not.toHaveProperty("connected");

		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("관리자 전용 응답이 공유 캐시에 실리지 않는다", async () => {
		getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
		checkIsAdmin.mockResolvedValue(true);

		const response = await GET(requestWith());

		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
	});
});
