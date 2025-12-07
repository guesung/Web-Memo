import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import {
	extractYoutubeTranscript,
	isYoutubePage,
	renderOpenSidePanelButton,
	setupTextSelectionHandler,
} from "./ui";

bridge.handle.PAGE_CONTENT((_, __, sendResponse) => {
	const content = getContentFromWeb();
	sendResponse({ content });
	return true;
});

bridge.handle.YOUTUBE_TRANSCRIPT(async (_, __, sendResponse) => {
	if (!isYoutubePage()) {
		sendResponse({
			success: false,
			transcript: "",
			error: "Not a YouTube video page",
		});
		return;
	}
	try {
		const result = await extractYoutubeTranscript();
		sendResponse({
			success: result.success,
			transcript: result.transcript,
			error: result.error,
		});
	} catch (error) {
		sendResponse({
			success: false,
			transcript: "",
			error: error instanceof Error ? error.message : "Failed to extract transcript",
		});
	}
});

renderOpenSidePanelButton();

async function initTextSelectionHandler() {
	const textSelectionEnabled = await ChromeSyncStorage.get<boolean>(
		STORAGE_KEYS.textSelectionEnabled,
	);
	if (textSelectionEnabled) {
		setupTextSelectionHandler();
	}
}

initTextSelectionHandler();

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
