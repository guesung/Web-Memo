import type { Page } from "@playwright/test";
import { describe, expect, it, vi } from "vitest";

vi.mock("@web-memo/shared/constants", () => ({
	PATHS: { login: "/login", memos: "/memos" },
	SUPABASE: {
		authCookie: { accessToken: "access-token", refreshToken: "refresh-token" },
	},
}));

import { login } from "./utils";

const makePage = (cookieNames: string[]) => {
	const click = vi.fn().mockResolvedValue(undefined);
	const page = {
		context: () => ({
			cookies: vi.fn().mockResolvedValue(cookieNames.map((name) => ({ name }))),
		}),
		goto: vi.fn().mockResolvedValue(undefined),
		waitForURL: vi.fn().mockResolvedValue(undefined),
		getByTestId: vi.fn().mockReturnValue({ click }),
	};
	return { page, click };
};

describe("login", () => {
	it("opens memos directly when both auth cookies exist", async () => {
		const { page, click } = makePage([
			"access-token",
			"refresh-token",
			"other",
		]);
		await login(page as unknown as Page);
		expect(page.goto).toHaveBeenCalledOnce();
		expect(page.goto).toHaveBeenCalledWith("/en/memos");
		expect(page.waitForURL).toHaveBeenCalledWith(/\/memos/);
		expect(click).not.toHaveBeenCalled();
	});

	it.each([
		{ cookieNames: ["access-token"] },
		{ cookieNames: ["refresh-token"] },
		{ cookieNames: [] },
	])("uses UI login when auth cookies are %j", async ({ cookieNames }) => {
		const { page, click } = makePage(cookieNames);
		await login(page as unknown as Page);
		expect(page.goto).toHaveBeenCalledOnce();
		expect(page.goto).toHaveBeenCalledWith("/en/login");
		expect(page.waitForURL).toHaveBeenNthCalledWith(1, /\/login/);
		expect(page.getByTestId).toHaveBeenCalledOnce();
		expect(page.getByTestId).toHaveBeenCalledWith("test-login-button");
		expect(click).toHaveBeenCalledOnce();
		expect(page.waitForURL).toHaveBeenNthCalledWith(2, /\/memos/);
	});
});
