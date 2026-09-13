import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@web-memo/env", () => ({ CONFIG: { webUrl: "https://example.com" } }));
vi.mock("@web-memo/shared/utils/extension", () => ({
	getSupabaseClient: async () => ({ auth: { getSession: mocks.getSession } }),
	I18n: { get: (key: string) => key },
}));

import { requestAi } from "./aiRequest";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});
describe("chat account isolation", () => {
	it("does not send previous-account chat when the current session changed", async () => {
		mocks.getSession.mockResolvedValue({
			data: {
				session: { user: { id: "new-user" }, access_token: "new-token" },
			},
		});
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		await expect(
			requestAi({
				path: "/chat",
				expectedUserId: "previous-user",
				body: { messages: ["previous private chat"] },
			}),
		).rejects.toThrow("billing_ai_signin");
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it("does not send messages after logout", async () => {
		mocks.getSession.mockResolvedValue({ data: { session: null } });
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		await expect(
			requestAi({ path: "/chat", expectedUserId: "previous-user", body: {} }),
		).rejects.toThrow("billing_ai_signin");
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it("sends only with the expected account's current token", async () => {
		mocks.getSession.mockResolvedValue({
			data: {
				session: { user: { id: "user" }, access_token: "current-token" },
			},
		});
		const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
		vi.stubGlobal("fetch", fetchMock);
		await requestAi({ path: "/chat", expectedUserId: "user", body: {} });
		expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
			"Bearer current-token",
		);
	});
});
