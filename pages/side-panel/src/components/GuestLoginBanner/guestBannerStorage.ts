import type { TGuestBannerVariant } from "./selectGuestBanner";

/** 닫은 권유 배너를 담는 chrome.storage.local 키. */
const DISMISSED_STORAGE_KEY = "guestBannerDismissed";
/** 한 번이라도 노출된 1회성 권유 배너를 담는 chrome.storage.local 키. */
const SHOWN_STORAGE_KEY = "guestBannerShown";

const VARIANTS: readonly TGuestBannerVariant[] = [
	"storageBlocked",
	"storageWarning",
	"countMany",
	"countFirstMilestone",
	"firstSave",
];

const isVariant = (value: unknown): value is TGuestBannerVariant =>
	VARIANTS.includes(value as TGuestBannerVariant);

const readVariants = async (key: string): Promise<TGuestBannerVariant[]> => {
	const stored = await chrome.storage.local.get(key);
	const value = stored[key];
	return Array.isArray(value) ? value.filter(isVariant) : [];
};

export const readDismissedGuestBanners = () =>
	readVariants(DISMISSED_STORAGE_KEY);

export const writeDismissedGuestBanners = (
	dismissed: readonly TGuestBannerVariant[],
) => chrome.storage.local.set({ [DISMISSED_STORAGE_KEY]: dismissed });

export const readShownGuestBanners = () => readVariants(SHOWN_STORAGE_KEY);

export const writeShownGuestBanners = (shown: readonly TGuestBannerVariant[]) =>
	chrome.storage.local.set({ [SHOWN_STORAGE_KEY]: shown });
