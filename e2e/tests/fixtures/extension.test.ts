import type { BrowserContext } from "@playwright/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	fixtures: {} as Record<string, unknown>,
	launchPersistentContext: vi.fn(),
	readFile: vi.fn(),
}));

vi.mock("@playwright/test", () => ({
	test: {
		extend: (fixtures: Record<string, unknown>) => {
			mocks.fixtures = fixtures;
			return { expect: vi.fn() };
		},
	},
	chromium: { launchPersistentContext: mocks.launchPersistentContext },
}));
vi.mock("node:fs/promises", () => ({ readFile: mocks.readFile }));
vi.mock("@web-memo/shared/constants", () => ({
	SUPABASE: {
		authToken: "auth-token",
		authCookie: { accessToken: "access-token", refreshToken: "refresh-token" },
	},
}));
vi.mock("../lib/mocks/supabaseGuard", () => ({
	supabaseGuardFixture: vi.fn(),
}));

import "./extension";

const NOW = new Date("2026-11-08T00:00:00.000Z");
const authCookie = (name: string, value = "value", domain = "localhost") => ({
	name,
	value,
	domain,
	path: "/",
	expires: -1,
	httpOnly: false,
	secure: false,
	sameSite: "Lax",
});
const token = (exp?: number) =>
	`header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;
const validCookies = () => [
	authCookie("access-token", token(Math.floor(NOW.getTime() / 1000) + 301)),
	authCookie("refresh-token"),
];

const makeContext = () => {
	const page = {
		url: () => "http://localhost:3000/en/install",
		close: vi.fn().mockResolvedValue(undefined),
		on: vi.fn(),
		mainFrame: vi.fn(),
	};
	const context = {
		pages: () => [page],
		on: vi.fn(),
		off: vi.fn(),
		addCookies: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
	};
	return { context, page };
};

const runFixture = async (
	reuseWebAuth: boolean | undefined = true,
	use: (context: BrowserContext) => Promise<void> = vi.fn(),
) => {
	const fixture = mocks.fixtures.context as (
		options: { reuseWebAuth: boolean | undefined },
		use: (context: BrowserContext) => Promise<void>,
	) => Promise<void>;
	await fixture({ reuseWebAuth }, use);
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	vi.clearAllMocks();
	mocks.readFile.mockResolvedValue(
		JSON.stringify({ cookies: validCookies(), origins: [] }),
	);
});

afterEach(() => vi.useRealTimers());

describe("extension context fixture", () => {
	it("defaults to reusing web auth and adds only auth cookies to a fresh context", async () => {
		const first = makeContext();
		const second = makeContext();
		mocks.launchPersistentContext
			.mockResolvedValueOnce(first.context)
			.mockResolvedValueOnce(second.context);
		const cookies = [
			...validCookies(),
			authCookie("auth-token"),
			authCookie("i18next"),
			authCookie("unrelated", "secret", "other.example"),
		];
		mocks.readFile.mockResolvedValue(
			JSON.stringify({
				cookies,
				origins: [{ origin: "https://other.example", localStorage: [] }],
			}),
		);
		expect(mocks.fixtures.reuseWebAuth).toEqual([true, { option: true }]);
		await runFixture(undefined);
		await runFixture(undefined);
		expect(mocks.launchPersistentContext).toHaveBeenCalledTimes(2);
		for (const { context } of [first, second]) {
			expect(context.addCookies).toHaveBeenCalledWith(cookies.slice(0, 3));
			expect(context.off).toHaveBeenCalledWith("page", expect.any(Function));
			expect(context.close).toHaveBeenCalledOnce();
		}
		expect(mocks.readFile).toHaveBeenCalledTimes(2);
	});

	it("skips reading auth state when reuseWebAuth is false", async () => {
		const { context } = makeContext();
		mocks.launchPersistentContext.mockResolvedValue(context);
		await runFixture(false);
		expect(mocks.readFile).not.toHaveBeenCalled();
		expect(context.addCookies).toHaveBeenCalledTimes(2);
		expect(context.close).toHaveBeenCalledOnce();
	});

	it.each(["access-token", "refresh-token"])(
		"rejects auth state missing %s and closes the context",
		async (missing) => {
			const { context } = makeContext();
			mocks.launchPersistentContext.mockResolvedValue(context);
			mocks.readFile.mockResolvedValue(
				JSON.stringify({
					cookies: validCookies().filter((cookie) => cookie.name !== missing),
					origins: [],
				}),
			);
			const use = vi.fn();
			await expect(runFixture(true, use)).rejects.toThrow(
				"웹 인증 상태에 확장 세션 복원용 쿠키가 없습니다.",
			);
			expect(use).not.toHaveBeenCalled();
			expect(context.off).toHaveBeenCalledWith("page", expect.any(Function));
			expect(context.close).toHaveBeenCalledOnce();
		},
	);

	it.each([300, 299, undefined])(
		"rejects a token exp of %s seconds from now",
		async (seconds) => {
			const { context } = makeContext();
			mocks.launchPersistentContext.mockResolvedValue(context);
			const cookies = [
				authCookie(
					"access-token",
					token(
						seconds === undefined
							? undefined
							: Math.floor(NOW.getTime() / 1000) + seconds,
					),
				),
				authCookie("refresh-token"),
			];
			mocks.readFile.mockResolvedValue(
				JSON.stringify({ cookies, origins: [] }),
			);
			await expect(runFixture()).rejects.toThrow(
				"웹 인증 토큰이 곧 만료됩니다.",
			);
			expect(context.addCookies).toHaveBeenCalledTimes(2);
			expect(context.off).toHaveBeenCalledWith("page", expect.any(Function));
			expect(context.close).toHaveBeenCalledOnce();
		},
	);

	it("stops watching and closes the context when the test body fails", async () => {
		const { context } = makeContext();
		mocks.launchPersistentContext.mockResolvedValue(context);
		await expect(
			runFixture(true, async () => {
				throw new Error("test failed");
			}),
		).rejects.toThrow("test failed");
		expect(context.off).toHaveBeenCalledWith("page", expect.any(Function));
		expect(context.close).toHaveBeenCalledOnce();
	});
});
