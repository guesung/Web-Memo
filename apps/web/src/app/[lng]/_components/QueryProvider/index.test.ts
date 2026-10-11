// @vitest-environment jsdom
import { useQueryClient } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import QueryProvider from ".";

const mocks = vi.hoisted(() => ({
	refetchMemoList: vi.fn(),
	settingUpdated: vi.fn(),
	captureException: vi.fn(),
}));

vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		request: {
			REFETCH_THE_MEMO_LIST_FROM_WEB: mocks.refetchMemoList,
			SETTING_UPDATED_FROM_WEB: mocks.settingUpdated,
		},
	},
}));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException }));
vi.mock("@web-memo/env", () => ({ CONFIG: { buildEnv: "development" } }));

afterEach(() => {
	vi.clearAllMocks();
});

describe("web QueryProvider mutation synchronization", () => {
	it("successful setting upsert sends a dedicated extension signal", async () => {
		const { mutate, unmount } = await renderMutation();
		await mutate({ data: { show_impression: true }, error: null }, "setting");

		expect(mocks.refetchMemoList).toHaveBeenCalledTimes(1);
		expect(mocks.settingUpdated).toHaveBeenCalledTimes(1);
		await unmount();
	});

	it("result errors and other mutations do not send the setting signal", async () => {
		const { mutate, unmount } = await renderMutation();
		await mutate({ data: null, error: { message: "save failed" } }, "setting");
		await mutate({ data: {}, error: null }, "memo");

		expect(mocks.refetchMemoList).toHaveBeenCalledTimes(2);
		expect(mocks.settingUpdated).not.toHaveBeenCalled();
		await unmount();
	});

	it("unavailable extension does not turn a successful save into a failure", async () => {
		mocks.refetchMemoList.mockRejectedValueOnce(new Error("unavailable"));
		mocks.settingUpdated.mockRejectedValueOnce(new Error("unavailable"));
		const { mutate, unmount } = await renderMutation();

		await expect(
			mutate({ data: { show_action_item: true }, error: null }, "setting"),
		).resolves.toEqual({ data: { show_action_item: true }, error: null });
		expect(mocks.settingUpdated).toHaveBeenCalledTimes(1);
		await unmount();
	});
});

async function renderMutation() {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	let queryClient: ReturnType<typeof useQueryClient>;
	function CaptureClient() {
		queryClient = useQueryClient();
		return null;
	}
	const root = createRoot(document.createElement("div"));
	await act(async () => {
		root.render(
			createElement(QueryProvider, { lng: "en" }, createElement(CaptureClient)),
		);
	});

	return {
		mutate: (result: unknown, feature: string) =>
			queryClient
				.getMutationCache()
				.build(queryClient, {
					meta: { feature, operation: "upsert", stage: "save" },
					mutationFn: async () => result,
				})
				.execute(undefined),
		unmount: async () => act(async () => root.unmount()),
	};
}
