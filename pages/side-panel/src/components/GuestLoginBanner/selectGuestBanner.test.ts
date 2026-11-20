import { describe, expect, it, vi } from "vitest";
import { nextOneTimeBanner, selectGuestBanner } from "./selectGuestBanner";

// 배럴이 환경변수를 읽는 모듈까지 끌어와 임계값만 대체한다.
vi.mock("@web-memo/shared/utils", () => ({
	LOCAL_STORAGE_BLOCK_RATIO: 0.95,
	LOCAL_STORAGE_WARN_RATIO: 0.8,
}));

describe("nextOneTimeBanner", () => {
	const BASE = {
		memoCount: 1,
		dismissed: [],
		shown: [],
		current: null,
	} as const;

	it("노출 기록이 없으면 첫 저장 배너를 고른다", () => {
		expect(nextOneTimeBanner(BASE)).toBe("firstSave");
	});

	it("이미 노출된 첫 저장 배너는 다시 고르지 않는다", () => {
		expect(nextOneTimeBanner({ ...BASE, shown: ["firstSave"] })).toBeNull();
	});

	it("같은 세션의 두 번째 저장에서는 떠 있던 첫 저장 배너를 숨긴다", () => {
		expect(
			nextOneTimeBanner({
				...BASE,
				shown: ["firstSave"],
				current: "firstSave",
			}),
		).toBeNull();
	});

	it("10개 이상이 된 첫 저장에서 개수 배너를 한 번 고르고 노출 뒤에는 다시 고르지 않는다", () => {
		expect(nextOneTimeBanner({ ...BASE, memoCount: 9 })).toBe("firstSave");
		expect(
			nextOneTimeBanner({ ...BASE, memoCount: 10, shown: ["firstSave"] }),
		).toBe("countFirstMilestone");
		expect(
			nextOneTimeBanner({
				...BASE,
				memoCount: 11,
				shown: ["firstSave", "countFirstMilestone"],
			}),
		).toBeNull();
	});

	it("떠 있는 개수 배너는 이후 저장에서도 닫기 전까지 남는다", () => {
		expect(
			nextOneTimeBanner({
				...BASE,
				memoCount: 11,
				shown: ["firstSave", "countFirstMilestone"],
				current: "countFirstMilestone",
			}),
		).toBe("countFirstMilestone");
	});

	it("50개째 배너는 10개째 배너를 닫았을 때만, 50개 이상이 된 저장에서 한 번 나온다", () => {
		const shown = ["firstSave", "countFirstMilestone"] as const;
		expect(nextOneTimeBanner({ ...BASE, memoCount: 50, shown })).toBeNull();
		expect(
			nextOneTimeBanner({
				...BASE,
				memoCount: 49,
				shown,
				dismissed: ["countFirstMilestone"],
			}),
		).toBeNull();
		expect(
			nextOneTimeBanner({
				...BASE,
				memoCount: 50,
				shown,
				dismissed: ["countFirstMilestone"],
			}),
		).toBe("countMany");
		expect(
			nextOneTimeBanner({
				...BASE,
				memoCount: 60,
				shown: [...shown, "countMany"],
				dismissed: ["countFirstMilestone", "countMany"],
			}),
		).toBeNull();
	});
});

describe("selectGuestBanner", () => {
	const BASE = { usageRatio: 0.1, dismissed: [], current: null } as const;

	it("조건이 없으면 배너가 없다", () => {
		expect(selectGuestBanner(BASE)).toBeNull();
	});

	it("이 세션에 떠 있는 1회성 배너를 보여 주고 닫았으면 숨긴다", () => {
		expect(selectGuestBanner({ ...BASE, current: "firstSave" })).toBe(
			"firstSave",
		);
		expect(
			selectGuestBanner({
				...BASE,
				current: "firstSave",
				dismissed: ["firstSave"],
			}),
		).toBeNull();
	});

	it("95% 이상이면 닫은 기록과 상관없이 차단 배너가 가장 먼저다", () => {
		expect(
			selectGuestBanner({
				usageRatio: 0.95,
				current: "countFirstMilestone",
				dismissed: ["storageWarning", "storageBlocked"],
			}),
		).toBe("storageBlocked");
	});

	it("80% 경고는 1회성 배너보다 앞서고, 닫으면 기억해 다음 배너로 넘어간다", () => {
		const warned = { ...BASE, usageRatio: 0.8, current: "firstSave" } as const;
		expect(selectGuestBanner(warned)).toBe("storageWarning");
		expect(
			selectGuestBanner({ ...warned, dismissed: ["storageWarning"] }),
		).toBe("firstSave");
	});
});
