import {
	LOCAL_STORAGE_BLOCK_RATIO,
	LOCAL_STORAGE_WARN_RATIO,
} from "@web-memo/shared/utils";

/** 비로그인 권유 배너의 변형. 우선순위 순서가 아니라 이름이다. */
export type TGuestBannerVariant =
	| "storageBlocked"
	| "storageWarning"
	| "countMany"
	| "countFirstMilestone"
	| "firstSave";

/** 개수 배너를 처음 보여 주는 기기 메모 수(10개째). */
export const GUEST_BANNER_FIRST_COUNT = 10;
/** 10개째 배너를 닫은 뒤 마지막으로 한 번 더 보여 주는 기기 메모 수(50개째). */
export const GUEST_BANNER_LAST_COUNT = 50;

interface IFSelectGuestBannerParams {
	/** 기기 저장소가 찬 비율(0~1) */
	usageRatio: number;
	/** 기기 메모 개수. 삭제한 메모는 세지 않는다 */
	memoCount: number;
	/** 사용자가 닫은 변형 */
	dismissed: readonly TGuestBannerVariant[];
	/** 이 패널을 연 뒤 메모를 저장한 적이 있는지 */
	hasSavedInSession: boolean;
}

/**
 * 지금 보여 줄 권유 배너 하나를 고른다. 없으면 `null`.
 * @description 우선순위는 95% 차단 > 80% 경고 > 개수 > 첫 저장이다. 차단은 닫을 수 없어 기억하지 않는다.
 * 50개째 배너는 10개째 배너를 닫은 경우에만 나오고, 닫은 변형은 다시 고르지 않는다.
 */
export const selectGuestBanner = ({
	usageRatio,
	memoCount,
	dismissed,
	hasSavedInSession,
}: IFSelectGuestBannerParams): TGuestBannerVariant | null => {
	const isDismissed = (variant: TGuestBannerVariant) =>
		dismissed.includes(variant);

	if (usageRatio >= LOCAL_STORAGE_BLOCK_RATIO) return "storageBlocked";
	if (
		usageRatio >= LOCAL_STORAGE_WARN_RATIO &&
		!isDismissed("storageWarning")
	) {
		return "storageWarning";
	}
	if (
		memoCount >= GUEST_BANNER_LAST_COUNT &&
		isDismissed("countFirstMilestone") &&
		!isDismissed("countMany")
	) {
		return "countMany";
	}
	if (
		memoCount >= GUEST_BANNER_FIRST_COUNT &&
		!isDismissed("countFirstMilestone")
	) {
		return "countFirstMilestone";
	}
	if (hasSavedInSession && memoCount >= 1 && !isDismissed("firstSave")) {
		return "firstSave";
	}
	return null;
};
