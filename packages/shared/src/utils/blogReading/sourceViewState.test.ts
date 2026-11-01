import { describe, expect, it } from "vitest";
import { getBlogSourceViewState } from "./sourceViewState";

describe("수집 상태 → 화면 상태", () => {
	it.each([
		["pending", "waiting"],
		["collecting", "collecting"],
		["partial", "partialFailed"],
		["complete", "complete"],
		["refreshing", "refreshing"],
		["refresh_failed", "refreshFailed"],
	] as const)("%s → %s", (phase, expected) => {
		expect(getBlogSourceViewState({ phase, resumeQueued: false })).toBe(
			expected,
		);
	});

	it.each(["pending", "partial", "refresh_failed"] as const)(
		"멈춘 상태(%s)에 재개 요청이 있으면 요청 접수로 보인다",
		(phase) => {
			expect(getBlogSourceViewState({ phase, resumeQueued: true })).toBe(
				"resumeQueued",
			);
		},
	);

	it("실행 중이면 요청이 있어도 실행 상태를 보인다", () => {
		expect(
			getBlogSourceViewState({ phase: "collecting", resumeQueued: true }),
		).toBe("collecting");
	});
});
