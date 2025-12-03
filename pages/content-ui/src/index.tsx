import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import {
	extractYoutubeTranscript,
	isYoutubePage,
	renderOpenSidePanelButton,
	setupTextSelectionHandler,
} from "./ui";

ExtensionBridge.responsePageContent();

if (isYoutubePage()) {
	ExtensionBridge.responseYoutubeTranscript(async () => {
		const result = await extractYoutubeTranscript();
		return {
			success: result.success,
			transcript: result.transcript,
			error: result.error,
		};
	});
}

renderOpenSidePanelButton();
setupTextSelectionHandler();
