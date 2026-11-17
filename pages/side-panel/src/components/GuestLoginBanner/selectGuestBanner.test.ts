import { describe, expect, it, vi } from "vitest";
import { selectGuestBanner } from "./selectGuestBanner";

// 배럴이 환경변수를 읽는 모듈까지 끌어와 임계값만 대체한다.
vi.mock("@web-memo/shared/utils", () => ({
	LOCAL_STORAGE_BLOCK_RATIO: 0.95,
	LOCAL_STORAGE_WARN_RATIO: 0.8,
}));

const BASE = {
	usageRatio: 0.1,
	memoCount: 1,
	dismissed: [],
	hasSavedInSession: false,
} as const;

describe("selectGuestBanner", () => {
	it("아무 조건도 없으면 배너를 보여 주지 않는다", () => {
		expect(selectGuestBanner(BASE)).toBeNull();
	});

	it("이 패널에서 저장하면 첫 저장 배너를 보여 주고, 닫으면 다시 보여 주지 않는다", () => {
		const saved = { ...BASE, hasSavedInSession: true };
		expect(selectGuestBanner(saved)).toBe("firstSave");
		expect(
			selectGuestBanner({ ...saved, dismissed: ["firstSave"] }),
		).toBeNull();
	});

	it("95% 이상이면 닫은 기록과 상관없이 차단 배너가 가장 먼저다", () => {
		expect(
			selectGuestBanner({
				...BASE,
				usageRatio: 0.95,
				memoCount: 10,
				hasSavedInSession: true,
				dismissed: ["storageWarning", "storageBlocked"],
			}),
		).toBe("storageBlocked");
	});

	it("80% 경고는 개수·첫 저장보다 앞서고, 닫으면 기억해 다음 배너로 넘어간다", () => {
		const warned = {
			...BASE,
			usageRatio: 0.8,
			memoCount: 10,
			hasSavedInSession: true,
		};
		expect(selectGuestBanner(warned)).toBe("storageWarning");
		expect(
			selectGuestBanner({ ...warned, dismissed: ["storageWarning"] }),
		).toBe("countFirstMilestone");
	});

	it("10개째에 개수 배너를 보여 주고 9개에서는 보여 주지 않는다", () => {
		expect(selectGuestBanner({ ...BASE, memoCount: 9 })).toBeNull();
		expect(selectGuestBanner({ ...BASE, memoCount: 10 })).toBe(
			"countFirstMilestone",
		);
	});

	it("개수 배너가 첫 저장 배너보다 앞선다", () => {
		expect(
			selectGuestBanner({ ...BASE, memoCount: 10, hasSavedInSession: true }),
		).toBe("countFirstMilestone");
	});

	it("50개째 배너는 10개째 배너를 닫았을 때만 나오고 한 번 닫으면 끝이다", () => {
		expect(selectGuestBanner({ ...BASE, memoCount: 50 })).toBe(
			"countFirstMilestone",
		);
		expect(
			selectGuestBanner({
				...BASE,
				memoCount: 49,
				dismissed: ["countFirstMilestone"],
			}),
		).toBeNull();
		expect(
			selectGuestBanner({
				...BASE,
				memoCount: 50,
				dismissed: ["countFirstMilestone"],
			}),
		).toBe("countMany");
		expect(
			selectGuestBanner({
				...BASE,
				memoCount: 80,
				dismissed: ["countFirstMilestone", "countMany"],
			}),
		).toBeNull();
	});
});
