import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChromeSyncStorage from "./ChromeSyncStorage";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("../../utils/extension", () => ({
	I18n: { get: () => "데이터를 불러오지 못했어요. 다시 시도해주세요" },
}));

beforeEach(() => {
	vi.resetAllMocks();
	vi.stubGlobal("chrome", { storage: { sync: { get: mocks.get } } });
});

afterEach(() => vi.unstubAllGlobals());

describe("ChromeSyncStorage.get", () => {
	it("저장된 값을 변환 없이 반환한다", async () => {
		mocks.get.mockResolvedValue({ language: "en" });

		await expect(ChromeSyncStorage.get("language")).resolves.toBe("en");
		expect(mocks.get).toHaveBeenCalledWith("language");
	});

	it("키가 없으면 기존 undefined 반환을 유지한다", async () => {
		mocks.get.mockResolvedValue({});

		await expect(ChromeSyncStorage.get("language")).resolves.toBeUndefined();
	});

	it.each([
		new Error("The browser is shutting down."),
		new Error("Storage is unavailable"),
		"The browser is shutting down.",
	])(
		"실패를 정상값으로 바꾸지 않고 원본 cause와 기존 문구를 보존한다: %s",
		async (cause) => {
			mocks.get.mockRejectedValue(cause);

			await expect(ChromeSyncStorage.get("language")).rejects.toMatchObject({
				message: `데이터를 불러오지 못했어요. 다시 시도해주세요: ${cause instanceof Error ? cause.message : cause}`,
				cause,
			});
		},
	);
});
