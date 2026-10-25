import { describe, expect, it, vi } from "vitest";
import { SupabaseSessionRequiredError } from "../../../utils/extension";
import { shouldRetrySupabaseClient } from "./useSupabaseClientQuery";

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://webmemo.example", buildEnv: "production" },
}));
vi.mock("../../../modules/chrome-storage", () => ({ ChromeSyncStorage: {} }));

describe("shouldRetrySupabaseClient", () => {
	it("로그인 쿠키가 없으면 기다려도 달라지지 않으므로 재시도하지 않는다", () => {
		const error = new SupabaseSessionRequiredError("로그인을 먼저 해주세요");

		expect(shouldRetrySupabaseClient(0, error)).toBe(false);
	});

	it("세션 복원 실패처럼 일시적일 수 있는 오류는 3회까지 재시도한다", () => {
		const error = new Error("로그인을 먼저 해주세요", {
			cause: new Error("x"),
		});

		expect(shouldRetrySupabaseClient(0, error)).toBe(true);
		expect(shouldRetrySupabaseClient(2, error)).toBe(true);
		expect(shouldRetrySupabaseClient(3, error)).toBe(false);
	});
});
