// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it } from "vitest";
import { summarizeClaudeExecution } from "./claude-diagnostics.mjs";

const failure = (result: string) => [
	{ type: "result", is_error: true, result },
];

describe("Claude 실패 진단", () => {
	it("실제 주간 한도 오류와 UTC 초기화 시각을 분류한다", () => {
		expect(
			summarizeClaudeExecution(
				failure("You've hit your weekly limit · resets 2pm (UTC)"),
			),
		).toEqual({
			isError: true,
			message: "Claude weekly usage limit reached; resets 2pm (UTC)",
		});
	});

	it.each([
		["You've hit your limit", "Claude usage limit reached"],
		["API Error: 401 unauthorized", "Claude authentication failed"],
		["429 too many requests", "Claude rate limit reached"],
		["API overloaded 529", "Claude service unavailable"],
	])("%s를 원문 없이 분류한다", (input, message) => {
		expect(summarizeClaudeExecution(failure(input)).message).toBe(message);
	});

	it("프롬프트·도구 출력·임의 오류 원문·메타데이터는 출력하지 않는다", () => {
		const result = summarizeClaudeExecution([
			{ type: "user", message: "private prompt" },
			{ type: "assistant", message: "private source" },
			{
				type: "result",
				is_error: true,
				subtype: "private metadata",
				result: "unknown secret-value sk-ant-oat01-abc123 gho_abcdef",
			},
		]);
		expect(result).toEqual({
			isError: true,
			message: "Claude error unclassified; raw response omitted",
		});
	});

	it("인증 오류에 섞인 자격 증명도 출력하지 않는다", () => {
		expect(
			summarizeClaudeExecution(
				failure("401 unauthorized Bearer unknown-format-secret"),
			).message,
		).toBe("Claude authentication failed");
	});

	it("errors 배열에서도 원문 없이 오류를 분류한다", () => {
		expect(
			summarizeClaudeExecution([
				{ type: "result", errors: ["401 unauthorized"] },
			]).message,
		).toBe("Claude authentication failed");
	});

	it("정상 응답과 결과 없는 실행은 원문을 출력하지 않는다", () => {
		expect(
			summarizeClaudeExecution([
				{ type: "result", is_error: false, result: "private response" },
			]).message,
		).toBe("Claude error unclassified; raw response omitted");
		expect(summarizeClaudeExecution([]).message).toBe(
			"Claude result unavailable",
		);
	});
});
