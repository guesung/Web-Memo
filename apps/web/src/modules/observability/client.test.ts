import { afterEach, describe, expect, it, vi } from "vitest";
import { getMemoRoute } from "./client";

const { initializeFaroMock, pushMeasurementMock, faroMock } = vi.hoisted(
	() => ({
		initializeFaroMock: vi.fn(),
		pushMeasurementMock: vi.fn(),
		faroMock: {
			api: null as null | { pushMeasurement: (...args: unknown[]) => void },
		},
	}),
);

vi.mock("@grafana/faro-web-sdk", () => ({
	faro: faroMock,
	initializeFaro: initializeFaroMock,
	TransportItemType: { MEASUREMENT: "measurement" },
}));

afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	initializeFaroMock.mockClear();
	pushMeasurementMock.mockClear();
	faroMock.api = null;
});

describe("getMemoRoute", () => {
	it("메모 화면 경로만 허용하고 쿼리와 상세 ID 경로는 제외한다", () => {
		expect(getMemoRoute("/ko/memos/wish")).toBe("/memos/wish");
		expect(getMemoRoute("/en/memos")).toBe("/memos");
		expect(getMemoRoute("/ko/memos/secret-id")).toBeNull();
		expect(getMemoRoute("/ko/memos/setting")).toBeNull();
		expect(getMemoRoute("/ko/memos?search=private")).toBeNull();
	});
});

describe("메모 화면 이동 측정", () => {
	it("뒤로 가기 훅이 URL 변경 뒤 호출되어도 client_navigation으로 분류한다", async () => {
		vi.stubEnv("NEXT_PUBLIC_FARO_URL", "https://collector.example/collect");
		const browserWindow = {
			location: {
				pathname: "/ko/memos/star",
				origin: "https://webmemo.xyz",
			},
			setTimeout,
			clearTimeout,
		};
		vi.stubGlobal("window", browserWindow);
		faroMock.api = { pushMeasurement: pushMeasurementMock };
		vi.resetModules();
		const { startMemoNavigation, reportMemoLoadStage, getMemoNavigationId } =
			await import("./client");

		browserWindow.location.pathname = "/ko/memos/wish";
		startMemoNavigation("https://webmemo.xyz/ko/memos/wish");
		reportMemoLoadStage({
			route: "/memos/wish",
			navigationId: getMemoNavigationId("/memos/wish"),
			stage: "shell_ready",
		});

		expect(pushMeasurementMock).toHaveBeenCalledWith(
			{
				type: "memo_page_latency",
				values: { duration_ms: expect.any(Number) },
			},
			{
				context: {
					route: "/memos/wish",
					stage: "shell_ready",
					navigation: "client_navigation",
					outcome: "success",
				},
			},
		);
	});

	it("이전 화면의 늦은 효과를 버리고 연속 이동을 cancelled로 종료한다", async () => {
		vi.stubEnv("NEXT_PUBLIC_FARO_URL", "https://collector.example/collect");
		const browserWindow = {
			location: {
				pathname: "/ko/memos/star",
				origin: "https://webmemo.xyz",
			},
			setTimeout,
			clearTimeout,
		};
		vi.stubGlobal("window", browserWindow);
		faroMock.api = { pushMeasurement: pushMeasurementMock };
		vi.resetModules();
		const {
			initializeMemoObservability: initialize,
			startMemoNavigation,
			reportMemoLoadStage,
			getMemoNavigationId,
		} = await import("./client");

		initialize();
		const oldNavigationId = getMemoNavigationId("/memos/star");
		startMemoNavigation("/ko/memos/wish");
		const callsBeforeOldEffect = pushMeasurementMock.mock.calls.length;
		reportMemoLoadStage({
			route: "/memos/star",
			navigationId: oldNavigationId,
			stage: "content_ready",
		});
		expect(pushMeasurementMock).toHaveBeenCalledTimes(callsBeforeOldEffect);

		startMemoNavigation("/ko/memos/reading");
		expect(pushMeasurementMock).toHaveBeenCalledWith(
			{
				type: "memo_page_latency",
				values: { duration_ms: expect.any(Number) },
			},
			{
				context: {
					route: "/memos/wish",
					stage: "navigation_end",
					navigation: "client_navigation",
					outcome: "cancelled",
				},
			},
		);
	});

	it("content_ready 뒤에 도착한 shell_ready와 data_ready도 같은 탐색으로 기록한다", async () => {
		vi.stubEnv("NEXT_PUBLIC_FARO_URL", "https://collector.example/collect");
		vi.stubGlobal("window", {
			location: {
				pathname: "/ko/memos/star",
				origin: "https://webmemo.xyz",
			},
			setTimeout,
			clearTimeout,
		});
		faroMock.api = { pushMeasurement: pushMeasurementMock };
		vi.resetModules();
		const {
			initializeMemoObservability: initialize,
			getMemoNavigationId,
			reportMemoLoadStage,
		} = await import("./client");
		initialize();
		const navigationId = getMemoNavigationId("/memos/star");

		reportMemoLoadStage({
			route: "/memos/star",
			navigationId,
			stage: "content_ready",
		});
		reportMemoLoadStage({
			route: "/memos/star",
			navigationId,
			stage: "shell_ready",
		});
		reportMemoLoadStage({
			route: "/memos/star",
			navigationId,
			stage: "data_ready",
		});

		expect(
			pushMeasurementMock.mock.calls.map(
				([, options]) => options.context.stage,
			),
		).toEqual(["content_ready", "shell_ready", "data_ready"]);
	});

	it("다른 탐색의 timeout 뒤 이전 화면 효과가 새 탐색을 만들지 않는다", async () => {
		vi.useFakeTimers();
		vi.stubEnv("NEXT_PUBLIC_FARO_URL", "https://collector.example/collect");
		vi.stubGlobal("window", {
			location: {
				pathname: "/ko/memos/star",
				origin: "https://webmemo.xyz",
			},
			setTimeout,
			clearTimeout,
		});
		faroMock.api = { pushMeasurement: pushMeasurementMock };
		vi.resetModules();
		const {
			initializeMemoObservability: initialize,
			getMemoNavigationId,
			startMemoNavigation,
			reportMemoLoadStage,
		} = await import("./client");
		initialize();
		const oldNavigationId = getMemoNavigationId("/memos/star");
		startMemoNavigation("/ko/memos/wish");
		vi.advanceTimersByTime(30_000);
		const callsBeforeOldEffect = pushMeasurementMock.mock.calls.length;

		reportMemoLoadStage({
			route: "/memos/star",
			navigationId: oldNavigationId,
			stage: "content_ready",
		});
		expect(pushMeasurementMock).toHaveBeenCalledTimes(callsBeforeOldEffect);
	});

	it("목록 표시가 끝나지 않으면 30초 뒤 timeout으로 종료한다", async () => {
		vi.useFakeTimers();
		vi.stubEnv("NEXT_PUBLIC_FARO_URL", "https://collector.example/collect");
		vi.stubGlobal("window", {
			location: {
				pathname: "/ko/memos/star",
				origin: "https://webmemo.xyz",
			},
			setTimeout,
			clearTimeout,
		});
		faroMock.api = { pushMeasurement: pushMeasurementMock };
		vi.resetModules();
		const { startMemoNavigation, getMemoNavigationId, reportMemoLoadStage } =
			await import("./client");

		startMemoNavigation("/ko/memos/wish");
		const firstNavigationId = getMemoNavigationId("/memos/wish");
		vi.advanceTimersByTime(30_000);
		expect(pushMeasurementMock).toHaveBeenCalledWith(
			{
				type: "memo_page_latency",
				values: { duration_ms: expect.any(Number) },
			},
			{
				context: {
					route: "/memos/wish",
					stage: "navigation_end",
					navigation: "client_navigation",
					outcome: "timeout",
				},
			},
		);
		startMemoNavigation("/ko/memos/wish");
		const retryNavigationId = getMemoNavigationId("/memos/wish");
		expect(retryNavigationId).not.toBe(firstNavigationId);
		vi.stubGlobal("window", {
			location: { pathname: "/ko/memos/wish", origin: "https://webmemo.xyz" },
			setTimeout,
			clearTimeout,
		});
		reportMemoLoadStage({
			route: "/memos/wish",
			navigationId: retryNavigationId,
			stage: "content_ready",
		});
		expect(pushMeasurementMock.mock.calls.at(-1)?.[1].context.outcome).toBe(
			"success",
		);
	});
});
