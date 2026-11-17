import type { TGuestBannerVariant } from "./selectGuestBanner";

/** 닫은 권유 배너를 담는 chrome.storage.local 키. */
const GUEST_BANNER_DISMISSED_STORAGE_KEY = "guestBannerDismissed";

const VARIANTS: readonly TGuestBannerVariant[] = [
	"storageBlocked",
	"storageWarning",
	"countMany",
	"countFirstMilestone",
	"firstSave",
];

const isVariant = (value: unknown): value is TGuestBannerVariant =>
	VARIANTS.includes(value as TGuestBannerVariant);

export const readDismissedGuestBanners = async (): Promise<
	TGuestBannerVariant[]
> => {
	const stored = await chrome.storage.local.get(
		GUEST_BANNER_DISMISSED_STORAGE_KEY,
	);
	const value = stored[GUEST_BANNER_DISMISSED_STORAGE_KEY];
	return Array.isArray(value) ? value.filter(isVariant) : [];
};

export const writeDismissedGuestBanners = (
	dismissed: readonly TGuestBannerVariant[],
) =>
	chrome.storage.local.set({
		[GUEST_BANNER_DISMISSED_STORAGE_KEY]: dismissed,
	});
