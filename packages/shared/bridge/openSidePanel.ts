import { BridgeRequest } from './type';

// Legacy code: this code is not used in the extension
export const BRIDGE_TYPE_OPEN_SIDE_PANEL = 'open-side-panel';
export const openSidePanel = () => {
  chrome.runtime.onMessage.addListener((bridgeResponse: BridgeRequest, sender) => {
    (async () => {
      if (!sender.tab) return;
      if (bridgeResponse.type === BRIDGE_TYPE_OPEN_SIDE_PANEL) {
        await chrome.sidePanel.open({ tabId: sender.tab.id, windowId: sender.tab.windowId });
        console.log(sender.tab.id);
      }
    })();
  });
};
