import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { isProduction } from "@web-memo/shared/utils";

import { OpenSidePanelButton } from "./components";
import { attachShadowTree } from "./utils";

const renderOpenSidePanelButton = async () => {
	if (isProduction()) return;

	attachShadowTree({
		shadowHostId: "OPEN_SIDE_PANEL",
		shadowTree: <OpenSidePanelButton />,
	});
};

ExtensionBridge.responsePageContent();

renderOpenSidePanelButton();
