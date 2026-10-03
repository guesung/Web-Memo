import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	notifyExtension: vi.fn(),
	setFailureReporter: vi.fn(),
	captureException: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://webmemo.example", buildEnv: "production" },
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: mocks.captureException,
	addBreadcrumb: mocks.addBreadcrumb,
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		request: { REFETCH_THE_MEMO_LIST_FROM_WEB: mocks.notifyExtension },
		setFailureReporter: mocks.setFailureReporter,
	},
}));

import QueryProvider from "./index";

const createQueryClient = () => {
	let queryClient: QueryClient | undefined;
	const CaptureQueryClient = () => {
		queryClient = useQueryClient();

		return null;
	};

	renderToStaticMarkup(
		createElement(
			QueryProvider,
			{ lng: "ko" },
			createElement(CaptureQueryClient),
		),
	);

	if (!queryClient) {
		throw new Error("QueryClient was not provided");
	}

	return queryClient;
};

beforeEach(() => {
	mocks.notifyExtension.mockReset();
	mocks.captureException.mockClear();
	mocks.addBreadcrumb.mockClear();
});

describe("웹 저장 후 선택적 확장 알림", () => {
	it("확장 알림이 응답하지 않아도 저장과 개별 성공 처리를 완료한다", async () => {
		mocks.notifyExtension.mockImplementation(() => new Promise(() => {}));
		const queryClient = createQueryClient();
		const handleMutationSuccess = vi.fn();
		const mutation = queryClient.getMutationCache().build(queryClient, {
			mutationFn: async () => ({ data: "saved", error: null }),
			onSuccess: handleMutationSuccess,
		});

		await expect(mutation.execute(undefined)).resolves.toEqual({
			data: "saved",
			error: null,
		});
		expect(handleMutationSuccess).toHaveBeenCalledOnce();
		expect(mutation.state.status).toBe("success");
		queryClient.clear();
	});

	it("확장 알림이 거절되어도 저장 성공을 유지하고 mutation 오류를 보고하지 않는다", async () => {
		mocks.notifyExtension.mockRejectedValue(new Error("Extension unavailable"));
		const queryClient = createQueryClient();
		const mutation = queryClient.getMutationCache().build(queryClient, {
			mutationFn: async () => ({ data: "saved", error: null }),
		});

		await expect(mutation.execute(undefined)).resolves.toMatchObject({
			data: "saved",
		});
		expect(mutation.state.status).toBe("success");
		expect(mocks.captureException).not.toHaveBeenCalled();
		queryClient.clear();
	});

	it("웹 SDK의 breadcrumb에 브리지 실패 메타데이터를 기록한다", () => {
		const failure = {
			messageType: "REFETCH_THE_MEMO_LIST_FROM_WEB",
			direction: "toExtension",
			classification: "Timeout",
		};
		mocks.setFailureReporter.mock.calls[0][0](failure);

		expect(mocks.addBreadcrumb).toHaveBeenCalledWith({
			category: "extension.bridge",
			level: "warning",
			data: failure,
		});
	});
});
