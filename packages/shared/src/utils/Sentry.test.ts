import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://webmemo.example", buildEnv: "production" },
}));

const mocks = vi.hoisted(() => ({
	init: vi.fn(),
	setUser: vi.fn(),
}));

vi.mock("@sentry/react", () => ({
	browserProfilingIntegration: vi.fn(),
	browserTracingIntegration: vi.fn(),
	init: mocks.init,
	setUser: mocks.setUser,
}));
vi.mock("./extension/Supabase", () => ({
	getSupabaseClient: vi.fn().mockRejectedValue(new Error("no session")),
}));
vi.mock("./Supabase", () => ({ AuthService: vi.fn() }));

import { initSentry } from "./Sentry";

beforeEach(() => {
	mocks.init.mockClear();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("initSentry", () => {
	it("확장에서는 manifest 버전을 release로 보낸다", async () => {
		vi.stubGlobal("chrome", {
			runtime: {
				id: "extension-id",
				getManifest: () => ({ version: "1.10.19" }),
			},
		});

		await initSentry();

		expect(mocks.init).toHaveBeenCalledWith(
			expect.objectContaining({ release: "1.10.19" }),
		);
	});

	it("확장이 아니면 release를 지정하지 않는다", async () => {
		vi.stubGlobal("chrome", undefined);

		await initSentry();

		expect(mocks.init).toHaveBeenCalledWith(
			expect.objectContaining({ release: undefined }),
		);
	});

	describe("beforeSend", () => {
		const getBeforeSend = async () => {
			vi.stubGlobal("chrome", undefined);

			await initSentry();

			const { beforeSend } = mocks.init.mock.calls[0][0];

			return beforeSend;
		};

		it("auth-js 락 타임아웃이 흘린 미처리 AbortError는 버린다", async () => {
			const beforeSend = await getBeforeSend();

			const event = {
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
			};

			expect(beforeSend(event)).toBeNull();
		});

		it("다른 오류는 그대로 보낸다", async () => {
			const beforeSend = await getBeforeSend();

			const event = {
				exception: {
					values: [{ type: "TypeError", value: "something broke" }],
				},
			};

			expect(beforeSend(event)).toBe(event);
		});
	});
});
