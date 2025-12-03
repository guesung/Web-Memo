export const TRANSCRIPT_CONFIG = {
	selectors: {
		transcriptButton: [
			'button[aria-label*="스크립트 표시" i]',
			'button[aria-label*="Show transcript" i]',
			'button[aria-label*="文字起こしを表示" i]',
			'button[aria-label*="显示字幕" i]',
			'button[aria-label*="Mostrar transcripción" i]',
			'button[aria-label*="Afficher la transcription" i]',
			'button[aria-label*="Transkript anzeigen" i]',
			'[data-target-id="engagement-panel-transcript"]',
			'yt-button-shape[aria-label*="transcript" i]',
		],
		transcriptContainer: [
			"ytd-transcript-segment-list-renderer",
			"ytd-transcript-renderer",
			'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]',
			'ytd-engagement-panel-section-list-renderer[target-id*="transcript"]',
		],
		transcriptSegment: [
			"ytd-transcript-segment-renderer",
			'.ytd-transcript-segment-renderer[role="button"]',
		],
		timestamp: [
			".segment-timestamp",
			".segment-start-offset .segment-timestamp",
			"div.segment-timestamp",
		],
		text: [
			"yt-formatted-string.segment-text",
			'yt-formatted-string[class*="segment-text"]',
			".segment-text",
		],
		expandButton: [
			"tp-yt-paper-button#expand:not([aria-disabled='true'])",
			"#expand:not([aria-disabled='true'])",
		],
		threeDotsMenu: [
			"#actions ytd-menu-renderer button[aria-label*='More actions' i]",
			"#actions ytd-menu-renderer button[aria-label*='메뉴' i]",
			"#actions ytd-menu-renderer button[aria-label*='その他の操作' i]",
			"#menu ytd-menu-renderer button[aria-haspopup='true']",
		],
		transcriptMenuItem: [
			'#items [role="menuitem"][aria-label*="transcript" i]',
			'#items [role="menuitem"][aria-label*="스크립트" i]',
			'#items [role="menuitem"][aria-label*="文字起こし" i]',
			'#items ytd-menu-service-item-renderer[aria-label*="transcript" i]',
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
