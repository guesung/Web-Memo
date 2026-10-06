// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMemoSettings } from "./useMemoSettings";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
	settingQueryOptions: vi.fn(),
	client: {},
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.query }));
vi.mock("@web-memo/shared/hooks", () => ({
	settingQueryOptions: mocks.settingQueryOptions,
	useSupabaseClientQuery: () => ({ data: mocks.client }),
}));

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe("메모 목록 설정 조회", () => {
	it("공용 옵션을 useQuery로 조회하고 cold loading에는 기존 표시 기본값을 쓴다", async () => {
		const { result, unmount } = await renderHook({
			data: undefined,
			isSuccess: false,
			isError: false,
			refetch: vi.fn(),
		});

		expect(mocks.settingQueryOptions).toHaveBeenCalledWith(mocks.client);
		expect(mocks.query).toHaveBeenCalledWith({ queryKey: ["setting"] });
		expect(result()).toMatchObject({
			showImpression: false,
			showActionItem: false,
			truncateMemoContent: true,
			isSettingReady: false,
			isSettingError: false,
		});
		await unmount();
	});

	it("warm cache의 설정값은 배경 조회 중에도 유지한다", async () => {
		const { result, unmount } = await renderHook({
			data: {
				data: {
					show_impression: true,
					show_action_item: true,
					truncate_memo_content: false,
				},
			},
			isSuccess: true,
			isError: false,
			isFetching: true,
			refetch: vi.fn(),
		});

		expect(result()).toMatchObject({
			showImpression: true,
			showActionItem: true,
			truncateMemoContent: false,
			isSettingReady: true,
		});
		await unmount();
	});

	it("조회 실패는 값을 버리지 않고 재시도를 노출하지만 저장은 막는다", async () => {
		const refetch = vi.fn();
		const { result, unmount } = await renderHook({
			data: { data: { truncate_memo_content: false } },
			isSuccess: false,
			isError: true,
			refetch,
		});

		expect(result()).toMatchObject({
			truncateMemoContent: false,
			isSettingReady: false,
			isSettingError: true,
			refetchSetting: refetch,
		});
		await unmount();
	});
});

async function renderHook(queryResult: object) {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	mocks.settingQueryOptions.mockReturnValue({ queryKey: ["setting"] });
	mocks.query.mockReturnValue(queryResult);
	let latestResult: ReturnType<typeof useMemoSettings>;
	function TestHook() {
		latestResult = useMemoSettings();
		return null;
	}
	const root = createRoot(document.createElement("div"));
	await act(async () => root.render(createElement(TestHook)));
	return {
		result: () => latestResult,
		unmount: async () => act(async () => root.unmount()),
	};
}
