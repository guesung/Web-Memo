import { beforeEach, describe, expect, it, vi } from "vitest";
import useAiFeatureSettingsQuery from "./useAiFeatureSettingsQuery";
import useSettingQuery from "./useSettingQuery";

const { useQuery, useSuspenseQuery, memoStoreKind } = vi.hoisted(() => ({
	useQuery: vi.fn(),
	useSuspenseQuery: vi.fn(),
	memoStoreKind: { current: "remote" as "remote" | "local" },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-query")>()),
	useQuery,
	useSuspenseQuery,
	useQueryClient: () => ({}),
}));
vi.mock("./useMemoStoreQuery", () => ({
	default: () => ({ data: { kind: memoStoreKind.current } }),
	memoStoreQueryOptions: () => ({ queryKey: ["memoStore"] }),
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
		memoStoreKind.current = "remote";
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
			.mockReturnValueOnce({ data: "remote" })
			.mockReturnValueOnce({ data: { data: setting }, isSuccess: true });

		expect(useAiFeatureSettingsQuery().showSummary).toBe(expected);
	});

	it.each(["pending", "error"])(
		"설정 조회 상태가 %s이면 요약을 숨긴다",
		(status) => {
			useQuery
				.mockReturnValueOnce({ data: {} })
				.mockReturnValueOnce({ data: "remote" })
				.mockReturnValueOnce({
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
			.mockReturnValueOnce({ data: undefined })
			.mockReturnValueOnce({ data: undefined, isSuccess: false });

		expect(useAiFeatureSettingsQuery().showSummary).toBe(false);
	});

	it("비로그인(기기 저장소)이면 설정 조회 없이 요약은 켜고 채팅은 끈다", () => {
		useQuery
			.mockReturnValueOnce({ data: undefined })
			.mockReturnValueOnce({ data: "local" })
			.mockReturnValueOnce({ data: undefined, isSuccess: false });

		expect(useAiFeatureSettingsQuery()).toEqual({
			showSummary: true,
			showAiChat: false,
		});
	});
});

describe("비로그인 설정", () => {
	it("기기 저장소를 쓰는 동안에는 서버 설정이 없는 것으로 보고 기본값을 준다", () => {
		memoStoreKind.current = "local";
		useSuspenseQuery.mockReturnValue({ data: { data: null, error: null } });

		const setting = useSettingQuery();

		expect(setting.showImpression).toBe(false);
		expect(setting.showActionItem).toBe(false);
		expect(setting.showSummary).toBe(true);
		expect(useSuspenseQuery.mock.calls[0][0].queryKey).toEqual([
			"setting",
			"guest",
		]);
	});
});
