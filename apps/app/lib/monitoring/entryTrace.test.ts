import { beforeEach, expect, it, vi } from "vitest";
import { recordEntryTrace, reportEntryError } from "./entryTrace";

const sentry = vi.hoisted(() => ({
	addBreadcrumb: vi.fn(),
	setTag: vi.fn(),
	setContext: vi.fn(),
	withScope: vi.fn((callback: (scope: unknown) => void) =>
		callback({
			setTag: sentry.setTag,
			setContext: sentry.setContext,
		}),
	),
	captureException: vi.fn(),
}));

vi.mock("@sentry/react-native", () => sentry);

beforeEach(() => vi.clearAllMocks());

it("URL·호스트·쿼리 값 대신 주소 형태만 breadcrumb에 기록한다", () => {
	const url = "https://private.example/secret?token=sensitive%25#section";
	recordEntryTrace({
		source: "notification",
		stage: "received",
		url,
		data: { isReady: true },
	});
	const breadcrumb = sentry.addBreadcrumb.mock.calls[0]?.[0];
	expect(breadcrumb).toMatchObject({
		category: "app.entry",
		data: {
			source: "notification",
			stage: "received",
			urlLength: url.length,
			urlScheme: "https",
			hasPercent: true,
			hasQuery: true,
			hasFragment: true,
			isReady: true,
		},
	});
	expect(JSON.stringify(breadcrumb)).not.toContain("private.example");
	expect(JSON.stringify(breadcrumb)).not.toContain("sensitive");
	recordEntryTrace({
		source: "app",
		stage: "state.changed",
		data: {
			state: "https://secret.example",
			code: Number.NaN,
			hidden: "secret",
		} as never,
	});
	expect(JSON.stringify(sentry.addBreadcrumb.mock.calls[1]?.[0])).not.toContain(
		"secret",
	);
});

it("오류에 진입 태그를 붙이고 Sentry 실패는 원래 흐름으로 전파하지 않는다", () => {
	const error = new Error("load failed");
	reportEntryError(error, {
		source: "webview",
		stage: "load_error",
		url: "custom://secret",
	});
	expect(sentry.captureException).toHaveBeenCalledWith(error);
	expect(sentry.setTag).toHaveBeenCalledWith("runtime", "mobile-app");
	expect(sentry.setTag).toHaveBeenCalledWith("entry_source", "webview");
	expect(sentry.setTag).toHaveBeenCalledWith("entry_stage", "load_error");
	expect(sentry.setContext).toHaveBeenCalledWith(
		"mobile_entry",
		expect.objectContaining({
			urlScheme: "other",
			hasQuery: false,
		}),
	);
	sentry.addBreadcrumb.mockImplementationOnce(() => {
		throw new Error("offline");
	});
	sentry.withScope.mockImplementationOnce(() => {
		throw new Error("offline");
	});
	expect(() =>
		recordEntryTrace({ source: "browser", stage: "ready" }),
	).not.toThrow();
	expect(() =>
		reportEntryError(error, { source: "browser", stage: "ready" }),
	).not.toThrow();
});
