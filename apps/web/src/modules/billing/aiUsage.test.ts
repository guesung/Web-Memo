import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateAiCostMicros } from "./aiUsage";
import { AI_RESERVATION_COST_MICROS } from "./config";

describe("calculateAiCostMicros", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("실제 토큰과 운영 환율로 원화 마이크로 비용을 계산한다", () => {
		vi.stubEnv("OPENAI_USD_TO_KRW_RATE", "1400");

		expect(
			calculateAiCostMicros({
				promptTokens: 1_000,
				completionTokens: 500,
			}),
		).toBe(630_000);
	});

	it("환율이 없으면 예약 상한을 유지한다", () => {
		vi.stubEnv("OPENAI_USD_TO_KRW_RATE", "");

		expect(
			calculateAiCostMicros({
				promptTokens: 1,
				completionTokens: 1,
			}),
		).toBe(AI_RESERVATION_COST_MICROS);
	});

	it("실제 비용이 예약 상한보다 크면 축소하지 않는다", () => {
		vi.stubEnv("OPENAI_USD_TO_KRW_RATE", "1400");

		expect(
			calculateAiCostMicros({
				promptTokens: 100_000,
				completionTokens: 100_000,
			}),
		).toBeGreaterThan(AI_RESERVATION_COST_MICROS);
	});
});
