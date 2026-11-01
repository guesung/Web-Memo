import { describe, expect, it } from "vitest";

import { shouldDropWebClientEvent } from "./webClientFilters";

describe("shouldDropWebClientEvent", () => {
	it("supabase-js의 미처리 AbortError는 버린다", () => {
		expect(
			shouldDropWebClientEvent({
				exception: {
					values: [
						{
							type: "AbortError",
							value: "signal is aborted without reason",
							mechanism: {
								type: "auto.browser.global_handlers.onunhandledrejection",
							},
						},
					],
				},
			}),
		).toBe(true);
	});

	it("Talisman 지갑 확장의 온보딩 미완료 오류는 버린다", () => {
		expect(
			shouldDropWebClientEvent({
				exception: {
					values: [
						{
							type: "Error",
							value:
								"Talisman extension has not been configured yet. Please continue with onboarding.",
						},
					],
				},
			}),
		).toBe(true);
	});

	it("무관한 오류는 버리지 않는다", () => {
		expect(
			shouldDropWebClientEvent({
				exception: {
					values: [
						{ type: "TypeError", value: "Cannot read properties of null" },
					],
				},
			}),
		).toBe(false);
	});

	it("exception이 없으면 버리지 않는다", () => {
		expect(shouldDropWebClientEvent({})).toBe(false);
	});
});
