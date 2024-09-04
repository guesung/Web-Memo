import { Runtime, Tab } from './shared';

// Legacy code: this code is not used in the extension
export const BRIDGE_TYPE_OPEN_SIDE_PANEL = 'open-side-panel';
export const requestOpenSidePanel = () => Runtime.sendMessage(BRIDGE_TYPE_OPEN_SIDE_PANEL);
export const responseOpenSidePanel = async () => {
  Runtime.onMessage(BRIDGE_TYPE_OPEN_SIDE_PANEL);
  const tab = await Tab.get();
  await chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
};
