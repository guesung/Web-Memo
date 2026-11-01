import { beforeEach, describe, expect, it, vi } from "vitest";
import useAiFeatureSettingsQuery from "./useAiFeatureSettingsQuery";
import useSettingQuery from "./useSettingQuery";

const { useQuery, useSuspenseQuery } = vi.hoisted(() => ({
	useQuery: vi.fn(),
	useSuspenseQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-query")>()),
	useQuery,
	useSuspenseQuery,
}));
vi.mock("./useSupabaseClientQuery", () => ({
	default: () => ({ data: {} }),
	supabaseClientQueryOptions: () => ({ queryKey: ["supabaseClient"] }),
}));
vi.mock("../../../utils", () => ({
	SettingService: class {
		getSetting = vi.fn();
	},
}));

describe("요약 설정 기본값", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([
		[null, true],
		[{ show_summary: true }, true],
		[{ show_summary: false }, false],
	])("설정 조회에서 저장값 %j은 요약 표시 %j", (setting, expected) => {
		useSuspenseQuery.mockReturnValue({ data: { data: setting } });

		expect(useSettingQuery().showSummary).toBe(expected);
	});

	it.each([
		[null, true],
		[{ show_summary: true }, true],
		[{ show_summary: false }, false],
	])("사이드 패널에서 저장값 %j은 요약 표시 %j", (setting, expected) => {
		useQuery
			.mockReturnValueOnce({ data: {} })
			.mockReturnValueOnce({ data: { data: setting }, isSuccess: true });

		expect(useAiFeatureSettingsQuery().showSummary).toBe(expected);
	});

	it.each(["pending", "error"])(
		"설정 조회 상태가 %s이면 요약을 숨긴다",
		(status) => {
			useQuery.mockReturnValueOnce({ data: {} }).mockReturnValueOnce({
				data: { data: { show_summary: true } },
				isSuccess: false,
				status,
			});

			expect(useAiFeatureSettingsQuery().showSummary).toBe(false);
		},
	);

	it("Supabase 클라이언트가 없으면 요약을 숨긴다", () => {
		useQuery
			.mockReturnValueOnce({ data: undefined })
			.mockReturnValueOnce({ data: undefined, isSuccess: false });

		expect(useAiFeatureSettingsQuery().showSummary).toBe(false);
	});
});
