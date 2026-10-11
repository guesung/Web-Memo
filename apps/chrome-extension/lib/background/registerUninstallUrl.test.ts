import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerUninstallUrl } from "./registerUninstallUrl";

const mocks = vi.hoisted(() => ({ getExtensionClientId: vi.fn() }));

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://www.webmemo.xyz" },
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { getExtensionClientId: mocks.getExtensionClientId },
}));

const setUninstallURL = vi.fn();

beforeEach(() => {
	mocks.getExtensionClientId.mockReset().mockResolvedValue("client.id");
	setUninstallURL.mockReset().mockResolvedValue(undefined);
	vi.stubGlobal("chrome", {
		runtime: {
			getManifest: () => ({ version: "1.11.0" }),
			setUninstallURL,
		},
	});
	vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("확장 제거 URL 등록", () => {
	it("client_id와 매니페스트 버전을 API URL에 담는다", async () => {
		await registerUninstallUrl();

		const url = new URL(setUninstallURL.mock.calls[0][0]);
		expect(url.origin).toBe("https://www.webmemo.xyz");
		expect(url.pathname).toBe("/api/uninstall");
		expect(url.searchParams.get("cid")).toBe("client.id");
		expect(url.searchParams.get("v")).toBe("1.11.0");
	});

	it("client_id 조회가 실패해도 버전만 등록한다", async () => {
		mocks.getExtensionClientId.mockRejectedValue(new Error("storage failed"));

		await registerUninstallUrl();

		const url = new URL(setUninstallURL.mock.calls[0][0]);
		expect(url.searchParams.has("cid")).toBe(false);
		expect(url.searchParams.get("v")).toBe("1.11.0");
	});

	it("client_id 때문에 1023자를 넘으면 버전만 등록한다", async () => {
		mocks.getExtensionClientId.mockResolvedValue("x".repeat(1024));

		await registerUninstallUrl();

		const url = setUninstallURL.mock.calls[0][0];
		expect(url.length).toBeLessThanOrEqual(1023);
		expect(new URL(url).searchParams.has("cid")).toBe(false);
	});

	it("등록 Promise가 거부되어도 오류를 전파하지 않는다", async () => {
		setUninstallURL.mockRejectedValue(new Error("Chrome failed"));

		await expect(registerUninstallUrl()).resolves.toBeUndefined();
		expect(console.warn).toHaveBeenCalledWith(
			"[uninstall] 제거 URL을 등록하지 못했습니다.",
			expect.any(Error),
		);
	});
});
