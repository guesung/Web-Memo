export const TRANSCRIPT_CONFIG = {
	selectors: {
		transcriptButton: [
			// Description area buttons (new YouTube UI)
			"#description ytd-video-description-transcript-section-renderer button",
			"ytd-video-description-transcript-section-renderer button",
			"#structured-description ytd-video-description-transcript-section-renderer button",
			// Engagement panel buttons
			'button[aria-label*="스크립트 표시" i]',
			'button[aria-label*="Show transcript" i]',
			'button[aria-label*="文字起こしを表示" i]',
			'button[aria-label*="显示字幕" i]',
			'button[aria-label*="Mostrar transcripción" i]',
			'button[aria-label*="Afficher la transcription" i]',
			'button[aria-label*="Transkript anzeigen" i]',
			'[data-target-id="engagement-panel-transcript"]',
			'yt-button-shape[aria-label*="transcript" i]',
			// Legacy selectors
			'ytd-button-renderer button[aria-label*="transcript" i]',
		],
		transcriptContainer: [
			"ytd-transcript-segment-list-renderer",
			"ytd-transcript-renderer",
			'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]',
			'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]',
			'ytd-engagement-panel-section-list-renderer[target-id*="transcript"]',
		],
		transcriptSegment: [
			"ytd-transcript-segment-renderer",
			'.ytd-transcript-segment-renderer[role="button"]',
			"ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer",
		],
		timestamp: [
			".segment-timestamp",
			".segment-start-offset .segment-timestamp",
			"div.segment-timestamp",
			"ytd-transcript-segment-renderer .segment-timestamp",
		],
		text: [
			"yt-formatted-string.segment-text",
			'yt-formatted-string[class*="segment-text"]',
			".segment-text",
			"ytd-transcript-segment-renderer .segment-text",
		],
		expandButton: [
			"tp-yt-paper-button#expand:not([aria-disabled='true'])",
			"#expand:not([aria-disabled='true'])",
			"#description-inner #expand",
			"ytd-text-inline-expander #expand",
		],
		threeDotsMenu: [
			"#actions ytd-menu-renderer yt-button-shape button",
			"#actions ytd-menu-renderer button[aria-label*='More actions' i]",
			"#actions ytd-menu-renderer button[aria-label*='더보기' i]",
			"#actions ytd-menu-renderer button[aria-label*='메뉴' i]",
			"#actions ytd-menu-renderer button[aria-label*='その他の操作' i]",
			"#menu ytd-menu-renderer button[aria-haspopup='true']",
			"ytd-menu-renderer.ytd-watch-metadata button",
		],
		transcriptMenuItem: [
			'ytd-menu-service-item-renderer:has(yt-formatted-string:contains("transcript"))',
			"tp-yt-paper-listbox ytd-menu-service-item-renderer",
			'#items [role="menuitem"][aria-label*="transcript" i]',
			'#items [role="menuitem"][aria-label*="스크립트" i]',
			'#items [role="menuitem"][aria-label*="文字起こし" i]',
			'#items ytd-menu-service-item-renderer[aria-label*="transcript" i]',
			"ytd-menu-popup-renderer ytd-menu-service-item-renderer",
		],
	},
	timing: {
		buttonClickDelay: 500,
		panelLoadTimeout: 10000,
		segmentLoadDelay: 300,
		mutationDebounce: 200,
	},
	validation: {
		minTextLength: 2,
		maxTextLength: 500,
	},
} as const;

export type TranscriptConfig = typeof TRANSCRIPT_CONFIG;
