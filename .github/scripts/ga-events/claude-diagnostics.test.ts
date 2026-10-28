// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it } from "vitest";
import { summarizeClaudeExecution } from "./claude-diagnostics.mjs";

describe("Claude 실패 진단", () => {
	it("실패 결과와 사용량 제한 원인을 보존한다", () => {
		const result = summarizeClaudeExecution([{ type: "result", subtype: "success", is_error: true, result: "You've hit your limit · resets 3pm (UTC)", num_turns: 1 }]);
		expect(result).toEqual({ subtype: "success", isError: true, turns: 1, message: "You've hit your limit · resets 3pm (UTC)" });
	});

	it("프롬프트와 도구 출력은 포함하지 않는다", () => {
		const result = summarizeClaudeExecution([{ type: "user", message: "private prompt" }, { type: "assistant", message: { content: [{ type: "text", text: "private source" }] } }, { type: "result", subtype: "success", is_error: true, errors: ["API Error: 401 unauthorized"] }]);
		expect(result.message).toBe("API Error: 401 unauthorized");
		expect(JSON.stringify(result)).not.toContain("private");
	});

	it("오류에 섞인 시크릿과 토큰은 가린다", () => {
		const result = summarizeClaudeExecution([{ type: "result", is_error: true, result: "failed secret-value sk-ant-oat01-abc123 gho_abcdef" }], ["secret-value"]);
		expect(result.message).not.toMatch(/secret-value|sk-ant-oat01-abc123|gho_abcdef/);
	});

	it("마지막 결과만 사용하고 길이를 제한한다", () => {
		const result = summarizeClaudeExecution([{ type: "result", result: "earlier" }, { type: "result", is_error: true, result: "x".repeat(10000) }]);
		expect(result.message.length).toBeLessThanOrEqual(2000);
	});

	it("결과가 없으면 진단 불가를 명시한다", () => {
		expect(summarizeClaudeExecution([]).message).toBe("Claude result unavailable");
	});
});
