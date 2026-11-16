import { afterEach, describe, expect, it, vi } from "vitest";
import { Identity } from "./Identity";

const launchWebAuthFlow = vi.fn();

const stubChrome = (extensionUrl: string, hasIdentity = true) => {
	vi.stubGlobal("chrome", {
		runtime: { getURL: () => extensionUrl },
		...(hasIdentity ? { identity: { launchWebAuthFlow } } : {}),
	});
};

afterEach(() => {
	vi.unstubAllGlobals();
	launchWebAuthFlow.mockReset();
});

describe("Identity.canLaunchWebAuthFlow", () => {
	it("크롬에서 identity 권한이 있으면 쓸 수 있다", () => {
		stubChrome("chrome-extension://abc/");

		expect(Identity.canLaunchWebAuthFlow()).toBe(true);
	});

	it("Firefox에서는 돌아올 주소가 달라 쓰지 않는다", () => {
		stubChrome("moz-extension://abc/");

		expect(Identity.canLaunchWebAuthFlow()).toBe(false);
	});

	it("identity 권한이 없는 빌드에서는 쓰지 않는다", () => {
		stubChrome("chrome-extension://abc/", false);

		expect(Identity.canLaunchWebAuthFlow()).toBe(false);
	});
});

describe("Identity.launchWebAuthFlow", () => {
	it("창이 확장 주소로 돌아오면 그 주소를 돌려준다", async () => {
		stubChrome("chrome-extension://abc/");
		launchWebAuthFlow.mockResolvedValue(
			"https://abc.chromiumapp.org/?login=google",
		);

		await expect(Identity.launchWebAuthFlow("https://web/start")).resolves.toBe(
			"https://abc.chromiumapp.org/?login=google",
		);
		expect(launchWebAuthFlow).toHaveBeenCalledWith({
			url: "https://web/start",
			interactive: true,
		});
	});

	it("사용자가 창을 닫으면 오류 대신 null을 돌려준다", async () => {
		stubChrome("chrome-extension://abc/");
		launchWebAuthFlow.mockRejectedValue(
			new Error("The user did not approve access."),
		);

		await expect(
			Identity.launchWebAuthFlow("https://web/start"),
		).resolves.toBeNull();
	});

	it("그 밖의 실패는 그대로 던진다", async () => {
		stubChrome("chrome-extension://abc/");
		launchWebAuthFlow.mockRejectedValue(
			new Error("Authorization page could not be loaded."),
		);

		await expect(
			Identity.launchWebAuthFlow("https://web/start"),
		).rejects.toThrow("could not be loaded");
	});
});
