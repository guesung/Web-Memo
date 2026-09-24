import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { requestCategorySuggestion } from "./requestCategorySuggestion";

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://web.example.com" },
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: { request: { PAGE_CONTENT: async () => ({ content: "본문" }) } },
}));

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

it("10초 API 타임아웃은 사용자가 취소한 AbortError와 구분해 진단 가능한 오류를 낸다", async () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(
			(_url: string, options: RequestInit) =>
				new Promise((_resolve, reject) => {
					options.signal?.addEventListener("abort", () => {
						reject(new DOMException("Aborted", "AbortError"));
					});
				}),
		),
	);
	const request = requestCategorySuggestion({
		pageTitle: "Article",
		pageUrl: "https://example.com/a",
		memoText: "memo",
		existingCategories: [],
		abortController: new AbortController(),
	});
	const assertion = expect(request).rejects.toThrow(
		"Category suggestion request timeout",
	);
	await vi.advanceTimersByTimeAsync(10000);
	await assertion;
});
