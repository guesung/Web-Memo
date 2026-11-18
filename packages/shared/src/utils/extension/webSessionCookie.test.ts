import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWebSessionAccessToken } from "./webSessionCookie";

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://webmemo.example" },
}));

const NAME = "sb-czwtqukymcqoberdoltq-auth-token";
const getAll = vi.fn();

const toBase64Url = (text: string) =>
	Buffer.from(text, "utf-8").toString("base64url");
const futureSeconds = () => Math.floor(Date.now() / 1000) + 3600;
const sessionJson = (overrides: Record<string, unknown> = {}) =>
	JSON.stringify({
		access_token: "web-access",
		refresh_token: "web-refresh",
		expires_at: futureSeconds(),
		...overrides,
	});
const cookie = (name: string, value: string) => ({ name, value });

beforeEach(() => {
	getAll.mockReset().mockResolvedValue([]);
	vi.stubGlobal("chrome", { cookies: { getAll } });
});

describe("getWebSessionAccessToken", () => {
	it("쿠키가 없으면 null이다", async () => {
		expect(await getWebSessionAccessToken()).toBeNull();
	});
	it("base64- 접두사 단일 쿠키를 디코드한다", async () => {
		getAll.mockResolvedValue([
			cookie(NAME, `base64-${toBase64Url(sessionJson())}`),
		]);
		expect(await getWebSessionAccessToken()).toBe("web-access");
	});
	it("UTF-8 문자가 든 세션도 디코드한다", async () => {
		getAll.mockResolvedValue([
			cookie(
				NAME,
				`base64-${toBase64Url(sessionJson({ user: { name: "메모" } }))}`,
			),
		]);
		expect(await getWebSessionAccessToken()).toBe("web-access");
	});
	it("조각 쿠키를 인덱스 순으로 이어 붙인다", async () => {
		const value = `base64-${toBase64Url(sessionJson())}`;
		const half = Math.floor(value.length / 2);
		getAll.mockResolvedValue([
			cookie(`${NAME}.1`, value.slice(half)),
			cookie("other", "x"),
			cookie(`${NAME}.0`, value.slice(0, half)),
		]);
		expect(await getWebSessionAccessToken()).toBe("web-access");
	});
	it("접두사가 없는 원문 JSON과 URL 인코딩 JSON도 읽는다", async () => {
		getAll.mockResolvedValue([cookie(NAME, sessionJson())]);
		expect(await getWebSessionAccessToken()).toBe("web-access");
		getAll.mockResolvedValue([cookie(NAME, encodeURIComponent(sessionJson()))]);
		expect(await getWebSessionAccessToken()).toBe("web-access");
	});
	it("만료된 세션은 null이다", async () => {
		getAll.mockResolvedValue([
			cookie(NAME, `base64-${toBase64Url(sessionJson({ expires_at: 1000 }))}`),
		]);
		expect(await getWebSessionAccessToken()).toBeNull();
	});
	it("해석할 수 없는 값은 null이다", async () => {
		getAll.mockResolvedValue([cookie(NAME, "base64-@@@")]);
		expect(await getWebSessionAccessToken()).toBeNull();
		getAll.mockResolvedValue([cookie(NAME, "not json")]);
		expect(await getWebSessionAccessToken()).toBeNull();
	});
});
