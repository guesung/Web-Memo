import { captureException } from "@sentry/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

vi.mock("@sentry/react", () => ({ captureException: vi.fn() }));
vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://webmemo.example" },
}));

const errorInfo = { componentStack: "" };

beforeEach(() => {
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.mocked(captureException).mockClear();
});

describe("ErrorBoundary.componentDidCatch", () => {
	it("일반 오류는 Sentry에 보고한다", () => {
		const error = new Error("boom");

		new ErrorBoundary({}).componentDidCatch(error, errorInfo);

		expect(captureException).toHaveBeenCalledWith(error);
	});

	it("로그아웃 상태의 오류는 보고하지 않는다", () => {
		new ErrorBoundary({}).componentDidCatch(
			new Error("로그인을 먼저 해주세요"),
			errorInfo,
		);

		expect(captureException).not.toHaveBeenCalled();
	});

	it("로그아웃 오류를 감싼 오류도 보고하지 않는다", () => {
		new ErrorBoundary({}).componentDidCatch(
			new Error("로그인을 먼저 해주세요", { cause: new Error("x") }),
			errorInfo,
		);

		expect(captureException).not.toHaveBeenCalled();
	});
});
