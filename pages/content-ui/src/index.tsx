import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import {
	extractYoutubeTranscript,
	isYoutubePage,
	renderOpenSidePanelButton,
	setupTextSelectionHandler,
} from "./ui";

ExtensionBridge.responsePageContent();

ExtensionBridge.responseYoutubeTranscript(async () => {
	if (!isYoutubePage()) {
		return {
			success: false,
			transcript: "",
			error: "Not a YouTube video page",
		};
	}
	const result = await extractYoutubeTranscript();
	return {
		success: result.success,
		transcript: result.transcript,
		error: result.error,
	};
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
