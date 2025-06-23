import "@src/index.css";
import "@web-memo/ui/global.css";

import SidePanel from "@src/SidePanel";
import { initSentry } from "@web-memo/shared/utils";
import { createRoot } from "react-dom/client";

initSentry();

function init() {
	const appContainer = document.querySelector("#app-container");
	if (!appContainer) {
		throw new Error("Can not find #app-container");
	}
	const root = createRoot(appContainer);
	root.render(<SidePanel />);
}

init();
