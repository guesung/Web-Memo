import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { renderOpenSidePanelButton, setupTextSelectionHandler } from "./ui";

ExtensionBridge.responsePageContent();

renderOpenSidePanelButton();
setupTextSelectionHandler();
