import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import {
	extractYoutubeTranscript,
	isYoutubePage,
	renderOpenSidePanelButton,
	setupHighlightRestore,
} from "./ui";

bridge.handle.PAGE_CONTENT(async (_, __, sendResponse) => {
	const title = document.title;
	const favicon = getFavicon();

	const content = getContentFromWeb();
	sendResponse({ content, category: "others", title, favicon });

	return true;
});

bridge.handle.YOUTUBE_TRANSCRIPT(async (_, __, sendResponse) => {
	if (!isYoutubePage()) {
		sendResponse("Not a YouTube video page");
		return;
	}
	try {
		const result = await extractYoutubeTranscript();
		analytics.trackEvent({
			name: "youtube_transcript_extract",
			params: { is_success: true },
		});
		sendResponse(result.transcript);
	} catch (error) {
		analytics.trackEvent({
			name: "youtube_transcript_extract",
			params: { is_success: false },
		});
		sendResponse(
			error instanceof Error ? error.message : "Failed to extract transcript",
		);
	}
});

renderOpenSidePanelButton();

setupHighlightRestore();

function getContentFromWeb() {
	const text = document.body.innerText;
	if (text) return text;

	try {
		const iframeText =
			document.querySelector("iframe")?.contentWindow?.document?.body
				?.innerText;
		return text + (iframeText ? `\n${iframeText}` : "");
	} catch {
		return text;
	}
}

function getFavicon(): string {
	const iconLink =
		document.querySelector<HTMLLinkElement>('link[rel="icon"]') ??
		document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]') ??
		document.querySelector<HTMLLinkElement>(
			'link[rel="apple-touch-icon-precomposed"]',
		) ??
		document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');

	if (iconLink?.href) {
		return iconLink.href;
	}

	return `${window.location.origin}/favicon.ico`;
}
