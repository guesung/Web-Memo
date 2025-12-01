import { normalizeUrl } from "../Url";
import { Tab } from "./module";

export const getTabInfo = async () => {
	const tab = await Tab.get();

	if (!tab.url || !tab.title) throw new Error("Save Failed: Invalid URL");

	return {
		title: tab.title,
		favIconUrl: tab.favIconUrl,
		url: normalizeUrl(tab.url),
	};
};
