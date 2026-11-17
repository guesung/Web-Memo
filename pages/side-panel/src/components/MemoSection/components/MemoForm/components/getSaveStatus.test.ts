import { describe, expect, it } from "vitest";
import { getSaveStatus } from "./getSaveStatus";

/** 기본값. 각 테스트는 필요한 값만 덮어써 시나리오를 만든다 */
const BASE_PARAMS = {
	saveStatus: "saved" as const,
	isOffline: false,
	hasPendingOfflineItem: false,
	hasSyncNetworkError: false,
	isSyncFailed: false,
};

describe("getSaveStatus", () => {
	it("storage write failure keeps retry visible while offline", () => {
		expect(
			getSaveStatus({ ...BASE_PARAMS, isOffline: true, saveStatus: "failed" }),
		).toBe("failed");
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				isOffline: true,
				saveStatus: "retrying",
			}),
		).toBe("retrying");
	});
	it("does not show saved while queue state is unknown or failed", () => {
		expect(
			getSaveStatus({ ...BASE_PARAMS, pendingOfflineStatus: "loading" }),
		).toBe("slow");
		expect(
			getSaveStatus({ ...BASE_PARAMS, pendingOfflineStatus: "error" }),
		).toBe("failed");
	});
	it("대기 항목이 없고 온라인이면 useMemoForm의 saveStatus를 그대로 쓴다", () => {
		expect(getSaveStatus({ ...BASE_PARAMS, saveStatus: "slow" })).toBe("slow");
		expect(getSaveStatus({ ...BASE_PARAMS, saveStatus: "failed" })).toBe(
			"failed",
		);
		expect(getSaveStatus({ ...BASE_PARAMS, saveStatus: "retrying" })).toBe(
			"retrying",
		);
		expect(getSaveStatus({ ...BASE_PARAMS, saveStatus: "empty" })).toBe(
			"empty",
		);
	});

	it("Q-04: 본문이 있는 기존 메모를 대기 항목 없이 오프라인으로 전환하면 offlineIdle을 보여준다", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				saveStatus: "saved",
				isOffline: true,
				hasPendingOfflineItem: false,
			}),
		).toBe("offlineIdle");
	});

	it("오프라인이고 대기 항목이 있으면 offline을 보여준다", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				isOffline: true,
				hasPendingOfflineItem: true,
			}),
		).toBe("offline");
	});

	it("Q-08: 온라인에서 네트워크 오류로 저장이 대기열로 넘어가면 offline을 보여준다(saved 아님)", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				isOffline: false,
				hasPendingOfflineItem: true,
				hasSyncNetworkError: true,
			}),
		).toBe("offline");
	});

	it("Q-21: flush 도중 네트워크 오류로 중단되면 offline을 보여준다(saved 아님)", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				isOffline: false,
				hasPendingOfflineItem: true,
				hasSyncNetworkError: true,
				isSyncFailed: false,
			}),
		).toBe("offline");
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

	describe("비로그인", () => {
		it.each(["empty", "saved"] as const)(
			"%s 상태도 오프라인 여부와 무관하게 기기 저장 상태로 보여준다",
			(saveStatus) => {
				expect(
					getSaveStatus({
						...BASE_PARAMS,
						saveStatus,
						isGuest: true,
						isOffline: false,
					}),
				).toBe("device");
				expect(
					getSaveStatus({
						...BASE_PARAMS,
						saveStatus,
						isGuest: true,
						isOffline: true,
					}),
				).toBe("device");
			},
		);

		it.each(["slow", "failed", "retrying"] as const)(
			"%s 상태는 가리지 않고 그대로 보여준다",
			(saveStatus) => {
				expect(
					getSaveStatus({ ...BASE_PARAMS, saveStatus, isGuest: true }),
				).toBe(saveStatus);
			},
		);
	});

	it("비로그인에서 저장 공간 차단으로 새 메모가 거부되면 실패 표시 대신 비워 둔다", () => {
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				isGuest: true,
				isStorageBlocked: true,
				saveStatus: "failed",
			}),
		).toBe("empty");
		expect(
			getSaveStatus({
				...BASE_PARAMS,
				isGuest: true,
				isStorageBlocked: false,
				saveStatus: "failed",
			}),
		).toBe("failed");
	});
});
