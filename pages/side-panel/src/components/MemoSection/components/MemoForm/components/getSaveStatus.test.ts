import { describe, expect, it } from "vitest";
import { getSaveStatus } from "./getSaveStatus";

/** 기본값. 각 테스트는 필요한 값만 덮어써 시나리오를 만든다 */
const BASE_PARAMS = {
	isSaving: false,
	isOffline: false,
	hasPendingOfflineItem: false,
	hasSyncNetworkError: false,
	isSyncFailed: false,
	hasMemoText: true,
};

describe("getSaveStatus", () => {
	it("저장 중이면 다른 값과 무관하게 saving을 보여준다", () => {
		expect(
			getSaveStatus({ ...BASE_PARAMS, isSaving: true, isOffline: true }),
		).toBe("saving");
	});

	it("Q-04: 본문이 있는 기존 메모를 입력 없이 오프라인으로 전환하면 offline만 보여준다", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				isOffline: true,
				hasPendingOfflineItem: false,
				hasMemoText: true,
			}),
		).toBe("offline");
	});

	it("오프라인이고 대기 항목이 있으면 offlineSaved를 보여준다", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				isOffline: true,
				hasPendingOfflineItem: true,
			}),
		).toBe("offlineSaved");
	});

	it("Q-08: 온라인에서 네트워크 오류로 저장이 대기열로 넘어가면 offlineSaved를 보여준다(저장됨 아님)", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				isOffline: false,
				hasPendingOfflineItem: true,
				hasSyncNetworkError: true,
			}),
		).toBe("offlineSaved");
	});

	it("Q-21: flush 도중 네트워크 오류로 중단되면 offlineSaved를 보여준다(저장됨 아님)", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				isOffline: false,
				hasPendingOfflineItem: true,
				hasSyncNetworkError: true,
				isSyncFailed: false,
			}),
		).toBe("offlineSaved");
	});

	it("대기 항목이 있고 서버 오류(syncFailed)면 syncFailed를 보여준다", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				hasPendingOfflineItem: true,
				isSyncFailed: true,
			}),
		).toBe("syncFailed");
	});

	it("대기 항목이 있고 온라인이며 실패도 없으면 syncing을 보여준다", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				hasPendingOfflineItem: true,
			}),
		).toBe("syncing");
	});

	it("대기 항목이 없고 온라인이며 내용이 있으면 saved를 보여준다", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				hasPendingOfflineItem: false,
			}),
		).toBe("saved");
	});

	it("대기 항목이 없고 온라인이며 내용도 없으면 아무것도 보여주지 않는다", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				hasPendingOfflineItem: false,
				hasMemoText: false,
			}),
		).toBeNull();
	});
});
