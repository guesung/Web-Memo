import {
	LOCAL_STORAGE_BLOCK_RATIO,
	LOCAL_STORAGE_WARN_RATIO,
} from "@web-memo/shared/utils";

/** 비로그인 권유 배너의 변형. */
export type TGuestBannerVariant =
	| "storageBlocked"
	| "storageWarning"
	| "countMany"
	| "countFirstMilestone"
	| "firstSave";

/** 저장 직후 딱 한 번 노출되는 변형(노출을 기록하고 다시 보여 주지 않는다). */
export type TOneTimeGuestBannerVariant = Extract<
	TGuestBannerVariant,
	"countMany" | "countFirstMilestone" | "firstSave"
>;

/** 개수 배너를 처음 보여 주는 기기 메모 수(10개째). */
export const GUEST_BANNER_FIRST_COUNT = 10;
/** 10개째 배너를 닫은 뒤 마지막으로 한 번 더 보여 주는 기기 메모 수(50개째). */
export const GUEST_BANNER_LAST_COUNT = 50;

/**
 * 저장이 끝난 직후, 이번 패널 세션에서 보여 줄 1회성 배너를 고른다. 없으면 `null`.
 * @description 1회는 닫힘이 아니라 노출 기준이다. 한 번 노출된 변형(`shown`)은 다시 고르지 않는다.
 * 50개째 배너는 10개째 배너를 닫은 경우에만 나온다. 이미 떠 있는 개수 배너는 닫기 전까지 남고,
 * 첫 저장 배너는 다음 저장 때 숨긴다.
 */
export const nextOneTimeBanner = ({
	memoCount,
	dismissed,
	shown,
	current,
}: {
	/** 기기 메모 개수. 삭제한 메모는 세지 않는다 */
	memoCount: number;
	dismissed: readonly TGuestBannerVariant[];
	/** 지금까지 한 번이라도 노출된 변형 */
	shown: readonly TGuestBannerVariant[];
	/** 이 세션에서 지금 떠 있는 1회성 배너 */
	current: TOneTimeGuestBannerVariant | null;
}): TOneTimeGuestBannerVariant | null => {
	if (
		memoCount >= GUEST_BANNER_LAST_COUNT &&
		dismissed.includes("countFirstMilestone") &&
		!shown.includes("countMany")
	) {
		return "countMany";
	}
	if (
		memoCount >= GUEST_BANNER_FIRST_COUNT &&
		!shown.includes("countFirstMilestone")
	) {
		return "countFirstMilestone";
	}
	if (memoCount >= 1 && !shown.includes("firstSave")) return "firstSave";
	return current === "firstSave" ? null : current;
};

/**
 * 지금 화면에 그릴 배너 하나를 고른다. 없으면 `null`.
 * @description 우선순위는 95% 차단 > 80% 경고 > 이 세션에 떠 있는 1회성 배너다.
 * 차단은 상태가 유지되는 동안 계속 보이고 닫을 수 없다. 경고는 닫으면 기억한다.
 */
export const selectGuestBanner = ({
	usageRatio,
	dismissed,
	current,
}: {
	/** 기기 저장소가 찬 비율(0~1) */
	usageRatio: number;
	dismissed: readonly TGuestBannerVariant[];
	current: TOneTimeGuestBannerVariant | null;
}): TGuestBannerVariant | null => {
	if (usageRatio >= LOCAL_STORAGE_BLOCK_RATIO) return "storageBlocked";
	if (
		usageRatio >= LOCAL_STORAGE_WARN_RATIO &&
		!dismissed.includes("storageWarning")
	) {
		return "storageWarning";
	}
	return current && !dismissed.includes(current) ? current : null;
};
