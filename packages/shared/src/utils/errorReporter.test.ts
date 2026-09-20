import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createErrorReporter, isAbortError } from "./errorReporter";

const createReporter = () => {
	const capture = vi.fn();

	return { capture, report: createErrorReporter({ capture }) };
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-09-20T00:00:00Z"));
});

afterEach(() => {
	vi.useRealTimers();
});

describe("createErrorReporter", () => {
	it("기능·동작·단계 태그와 fingerprint를 붙여 보낸다", () => {
		const { capture, report } = createReporter();

		const isReported = report({
			error: new Error("boom"),
			feature: "summary",
			operation: "generate",
			stage: "fetch",
		});

		expect(isReported).toBe(true);
		expect(capture.mock.calls[0][1]).toEqual({
			level: "error",
			tags: { feature: "summary", operation: "generate", stage: "fetch" },
			fingerprint: ["summary", "generate", "fetch"],
			extra: { occurredAt: Date.now() },
		});
	});

	it("제목에 기능·동작·단계를 붙여 보낸다", () => {
		const { capture, report } = createReporter();

		report({
			error: new Error("boom"),
			feature: "memo",
			operation: "create-memo",
			stage: "insert",
		});

		expect(capture.mock.calls[0][0].message).toBe(
			"[memo/create-memo/insert] boom",
		);
	});

	it("원본 오류는 cause로 남기고 이름을 유지한다", () => {
		const { capture, report } = createReporter();
		const original = new TypeError("boom");

		report({
			error: original,
			feature: "summary",
			operation: "generate",
			stage: "fetch",
		});

		const captured = capture.mock.calls[0][0];

		expect(captured.cause).toBe(original);
		expect(captured.name).toBe("TypeError");
	});

	it("원본 오류의 메시지는 바꾸지 않는다", () => {
		const { report } = createReporter();
		const original = new Error("boom");

		report({
			error: original,
			feature: "memo",
			operation: "create-memo",
			stage: "update",
		});

		expect(original.message).toBe("boom");
	});

	it("추가 태그와 extra를 합치되 fingerprint에는 넣지 않는다", () => {
		const { capture, report } = createReporter();

		report({
			error: new Error("boom"),
			feature: "summary",
			operation: "generate",
			stage: "fetch",
			tags: { host: "example.com" },
			extra: { retry: 1 },
		});

		const context = capture.mock.calls[0][1];

		expect(context.tags).toEqual({
			feature: "summary",
			operation: "generate",
			stage: "fetch",
			host: "example.com",
		});
		expect(context.fingerprint).toEqual(["summary", "generate", "fetch"]);
		expect(context.extra).toEqual({ occurredAt: Date.now(), retry: 1 });
	});

	it("groupByMessage를 켜면 메시지를 fingerprint에 넣는다", () => {
		const { capture, report } = createReporter();

		report({
			error: new Error("timeout"),
			feature: "side-panel",
			operation: "mutation",
			stage: "unknown",
			groupByMessage: true,
		});

		expect(capture.mock.calls[0][1].fingerprint).toEqual([
			"side-panel",
			"mutation",
			"unknown",
			"timeout",
		]);
	});

	it("Error가 아닌 값은 Error로 감싸서 보낸다", () => {
		const { capture, report } = createReporter();

		report({
			error: "문자열 오류",
			feature: "chat",
			operation: "send",
			stage: "general",
		});

		expect(capture.mock.calls[0][0]).toBeInstanceOf(Error);
		expect(capture.mock.calls[0][0].message).toBe(
			"[chat/send/general] 문자열 오류",
		);
		expect(capture.mock.calls[0][0].cause).toBeInstanceOf(Error);
	});

	it("Error가 아니어도 message가 있는 객체는 그 메시지를 쓴다", () => {
		const { capture, report } = createReporter();

		report({
			error: { message: "duplicate key", code: "23505" },
			feature: "memo",
			operation: "create-memo",
			stage: "insert",
		});

		expect(capture.mock.calls[0][0].message).toBe(
			"[memo/create-memo/insert] duplicate key",
		);
	});

	it("취소 오류는 보내지 않는다", () => {
		const { capture, report } = createReporter();
		const abortError = new Error("aborted");
		abortError.name = "AbortError";

		const isReported = report({
			error: abortError,
			feature: "chat",
			operation: "send",
			stage: "general",
		});

		expect(isReported).toBe(false);
		expect(capture).not.toHaveBeenCalled();
	});

	it("같은 기능·단계·메시지는 8초 안에 한 번만 보낸다", () => {
		const { capture, report } = createReporter();
		const params = {
			error: new Error("boom"),
			feature: "summary",
			operation: "generate",
			stage: "fetch",
		};

		expect(report(params)).toBe(true);
		vi.advanceTimersByTime(7_999);
		expect(report(params)).toBe(false);
		vi.advanceTimersByTime(1);
		expect(report(params)).toBe(true);
		expect(capture).toHaveBeenCalledTimes(2);
	});

	it("단계나 메시지가 다르면 중복으로 보지 않는다", () => {
		const { capture, report } = createReporter();
		const base = {
			feature: "summary",
			operation: "generate",
		};

		report({ ...base, stage: "fetch", error: new Error("a") });
		report({ ...base, stage: "parse", error: new Error("a") });
		report({ ...base, stage: "fetch", error: new Error("b") });

		expect(capture).toHaveBeenCalledTimes(3);
	});

	it("리포터마다 중복 억제 기록을 따로 가진다", () => {
		const first = createReporter();
		const second = createReporter();
		const params = {
			error: new Error("boom"),
			feature: "summary",
			operation: "generate",
			stage: "fetch",
		};

		first.report(params);

		expect(second.report(params)).toBe(true);
	});
});

describe("isAbortError", () => {
	it("AbortError와 CanceledError만 취소로 본다", () => {
		const abortError = new Error("x");
		abortError.name = "AbortError";
		const canceledError = new Error("x");
		canceledError.name = "CanceledError";

		expect(isAbortError(abortError)).toBe(true);
		expect(isAbortError(canceledError)).toBe(true);
		expect(isAbortError(new Error("x"))).toBe(false);
		expect(isAbortError("AbortError")).toBe(false);
	});
});
