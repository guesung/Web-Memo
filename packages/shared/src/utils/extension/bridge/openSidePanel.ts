import { Runtime } from '../module';

export const BRIDGE_TYPE_OPEN_SIDE_PANEL = 'OPEN_SIDE_PANEL';
export const OPEN_SIDE_PANEL_ID = 'OPEN_SIDE_PANEL';

/**
 * servicer worker에게 SidePanel을 열도록 요청한다.
 */
export const requestOpenSidePanel = () => Runtime.sendMessage(BRIDGE_TYPE_OPEN_SIDE_PANEL);

/**
 * servicer worker가 SidePanel을 연다.
 */
export const responseOpenSidePanel = async () => {
  chrome.runtime.onMessage.addListener((request, sender) => {
    console.log(1);
    console.log(request.type);
    if (request.type === BRIDGE_TYPE_OPEN_SIDE_PANEL) {
      console.log(sender.tab?.windowId);
      if (!sender.tab?.windowId) return;
      chrome.sidePanel.open({ windowId: sender.tab.windowId });
    }
  });
};
