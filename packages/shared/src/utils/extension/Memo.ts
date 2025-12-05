import { normalizeUrl } from "../Url";
import { Tab } from "./module";

export const getTabInfo = async () => {
	const tab = await Tab.get();

	if (!tab) {
		throw new Error("Failed to get current tab");
	}

	if (!tab.url || !tab.title) {
		throw new Error("Current tab has no URL or title");
	}

	try {
		return {
			title: tab.title,
			favIconUrl: tab.favIconUrl ?? undefined,
			url: normalizeUrl(tab.url),
		};
	} catch (error) {
		throw new Error(
			`Failed to normalize tab URL: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
};
