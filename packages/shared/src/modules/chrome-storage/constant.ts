/**
 * 확장 프로그램의 저장소 키.
 * @description pastMemoDismissedUrls만 용량 때문에 chrome.storage.local에 두고, 나머지는 동기화 저장소(ChromeSyncStorage)에 둔다.
 */
export const STORAGE_KEYS = {
	youtubePrompts: "youtubePrompts",
	webPrompts: "webPrompts",
	language: "language",
	theme: "theme",
	autoApplyCategory: "autoApplyCategory",
	tabHeight: "tabHeight",
	memoFieldRatios: "memoFieldRatios",
	chatMessages: "chatMessages",
	impressionSectionEnabled: "impressionSectionEnabled",
	actionItemSectionEnabled: "actionItemSectionEnabled",
	highlightBubbleEnabled: "highlightBubbleEnabled",
	highlightBubblePosition: "highlightBubblePosition",
	highlightDisabledSites: "highlightDisabledSites",
	highlightIntroSeen: "highlightIntroSeen",
	dismissedNoticeIds: "dismissedNoticeIds",
	pastMemoDismissedUrls: "pastMemoDismissedUrls",
} as const;
