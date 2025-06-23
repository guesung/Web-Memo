import "@src/index.css";
import "@web-memo/ui/global.css";

import { initSentry } from "@web-memo/shared/utils";
import { createRoot } from "react-dom/client";

import Options from "./Options";

initSentry();

function init() {
	const appContainer = document.querySelector("#app-container");
	if (!appContainer) {
		throw new Error("Can not find #app-container");
	}
	const root = createRoot(appContainer);
	root.render(<Options />);
}

init();
