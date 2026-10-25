import { describe, expect, it, vi } from "vitest";

vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key },
}));

import { getOfflineControlDisabledReason } from "./offlineControls";

describe("getOfflineControlDisabledReason", () => {
	it("온라인이고 동기화 중이 아니면 막지 않는다", () => {
		expect(
			getOfflineControlDisabledReason({
				isOffline: false,
				isSyncing: false,
				kind: "change",
			}),
		).toBeUndefined();
	});

	it("동기화 중이면 종류와 무관하게 공통 문구를 쓴다", () => {
		expect(
			getOfflineControlDisabledReason({
				isOffline: false,
				isSyncing: true,
				kind: "delete",
			}),
		).toBe("control_disabled_syncing");
	});

	it.each([
		["change", "control_disabled_offline_change"],
		["delete", "control_disabled_offline_delete"],
	] as const)("오프라인 · %s는 %s를 쓴다", (kind, expectedKey) => {
		expect(
			getOfflineControlDisabledReason({
				isOffline: true,
				isSyncing: false,
				kind,
			}),
		).toBe(expectedKey);
	});

	it("오프라인이면서 동기화 중이면 동기화 문구가 우선한다", () => {
		expect(
			getOfflineControlDisabledReason({
				isOffline: true,
				isSyncing: true,
				kind: "change",
			}),
		).toBe("control_disabled_syncing");
	});
});
