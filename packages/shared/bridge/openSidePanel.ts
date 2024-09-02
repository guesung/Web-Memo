import { Runtime, Tab } from './shared';

// Legacy code: this code is not used in the extension
export const BRIDGE_TYPE_OPEN_SIDE_PANEL = 'open-side-panel';
export const openSidePanel = () => {
  Runtime.onMessage(BRIDGE_TYPE_OPEN_SIDE_PANEL, null, async () => {
    const tab = await Tab.get();
    chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
  });
};
