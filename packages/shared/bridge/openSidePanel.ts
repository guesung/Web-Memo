import { BridgeRequest } from './type';

export const BRIDGE_TYPE_OPEN_SIDE_PANEL = 'open-side-panel';
export const queryOpenSidePanel = () => {
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
