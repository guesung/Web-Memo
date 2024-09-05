import { Runtime } from './shared';

export const BRIDGE_TYPE_UPDATE_SIDE_PANEL = 'update-side-panel';
export const requestUpdateSidePanel = () => Runtime.sendMessage(BRIDGE_TYPE_UPDATE_SIDE_PANEL);
export const responseUpdateSidePanel = async (callbackFn: () => void) => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request) return;
    if (request.type === BRIDGE_TYPE_UPDATE_SIDE_PANEL) {
      callbackFn();
    }
  });
};
