import { beforeEach, expect, it, vi } from "vitest";
import { classifyPastMemoAge, PastMemoTracking } from "./pastMemoTracking";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent },
}));
let tracking: PastMemoTracking;
beforeEach(() => {
	trackEvent.mockReset();
	tracking = new PastMemoTracking();
	tracking.updateContext("a", "page-a");
});
function start() {
	const attempt = tracking.start("rule");
	if (!attempt) throw new Error("Expected authenticated attempt");
	return attempt;
}
it("24시간 경계와 미래·잘못된 시각을 시작 시각 기준으로 분류한다", () => {
	const now = Date.parse("2026-10-28T00:00:00Z");
	expect(classifyPastMemoAge("2026-10-27T00:00:00Z", now)).toBe("existing");
	expect(classifyPastMemoAge("2026-10-27T00:00:00.001Z", now)).toBe("recent");
	expect(classifyPastMemoAge("2026-10-28T00:00:00.001Z", now)).toBe("unknown");
	expect(classifyPastMemoAge("invalid", now)).toBe("unknown");
	expect(classifyPastMemoAge(null, now)).toBe("unknown");
});
it("성공·실패·취소 경쟁은 첫 결과 한 번만 확정한다", () => {
	const attempt = start();
	tracking.finish(attempt, "displayed", "existing");
	tracking.finish(attempt, "query_error");
	tracking.finish(attempt, "cancelled");
	expect(trackEvent.mock.calls.map(([event]) => event)).toEqual([
		{ name: "past_memo_view_start", params: { source: "rule" } },
		{
			name: "past_memo_view_result",
			params: {
				source: "rule",
				is_success: true,
				reason: "displayed",
				action: "existing",
			},
		},
	]);
});
it("scope 변경 전 결과를 차단하고 실제 전환은 취소 한 번으로 종료한다", () => {
	const attempt = start();
	tracking.updateContext("a", "page-b");
	tracking.finish(attempt, "displayed", "existing");
	tracking.cancelOutsideScope("page-b");
	tracking.cancelOutsideScope("page-b");
	expect(trackEvent).toHaveBeenLastCalledWith({
		name: "past_memo_view_result",
		params: {
			source: "rule",
			is_success: false,
			reason: "cancelled",
			action: "unknown",
		},
	});
	expect(trackEvent).toHaveBeenCalledTimes(2);
});
it("뒤로 후 다시 열기는 새 시도이고 이전 응답은 무시한다", () => {
	const previous = start();
	const next = start();
	tracking.finish(previous, "displayed", "existing");
	tracking.finish(next, "not_found");
	expect(trackEvent.mock.calls.map(([event]) => event.name)).toEqual([
		"past_memo_view_start",
		"past_memo_view_result",
		"past_memo_view_start",
		"past_memo_view_result",
	]);
});
it("계정 전환·로그아웃 후 이전 시도와 원문 완료는 모두 무시한다", () => {
	const attempt = start();
	tracking.finish(attempt, "displayed", "existing");
	const complete = tracking.captureReuse(attempt);
	tracking.updateContext(undefined, "page-a");
	tracking.updateContext("a", "page-a");
	complete();
	tracking.finish(attempt, "cancelled");
	expect(tracking.isCurrent(attempt)).toBe(false);
	expect(trackEvent).toHaveBeenCalledTimes(2);
});
it("원문 클릭 후 탭scope 변경은 캡처한 성공 시도의 reuse를 한 번 허용한다", () => {
	const attempt = start();
	tracking.finish(attempt, "displayed", "existing");
	const complete = tracking.captureReuse(attempt);
	tracking.updateContext("a", "page-b");
	tracking.cancelOutsideScope("page-b");
	complete();
	complete();
	expect(trackEvent).toHaveBeenCalledTimes(3);
	expect(trackEvent).toHaveBeenLastCalledWith({
		name: "past_memo_reuse",
		params: { source: "rule", action: "source_open" },
	});
});
it.each(["recent", "unknown"] as const)(
	"%s 표시와 결과 전 클릭은 reuse 대상에서 제외한다",
	(age) => {
		const attempt = start();
		const pending = tracking.captureReuse(attempt);
		tracking.finish(attempt, "displayed", age);
		pending();
		tracking.captureReuse(attempt)();
		expect(trackEvent).toHaveBeenCalledTimes(2);
	},
);
it("동기·비동기 Analytics 실패가 시도 종료나 UI 콜백에 전파되지 않는다", async () => {
	trackEvent
		.mockImplementationOnce(() => {
			throw new Error("offline");
		})
		.mockRejectedValueOnce(new Error("offline"));
	const attempt = start();
	expect(() => tracking.finish(attempt, "not_found")).not.toThrow();
	await Promise.resolve();
	expect(attempt.terminal).toBe(true);
});
