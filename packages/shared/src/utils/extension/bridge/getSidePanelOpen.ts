import { EXTENSION_ID } from '@src/constants';
import { Runtime } from '../module';

export const BRIDGE_TYPE_GET_SIDE_PANEL_OPEN = 'BRIDGE_TYPE_GET_SIDE_PANEL_OPEN';
export const requestGetSidePanelOpen = (callbackFn: () => void) =>
  chrome.runtime.sendMessage(EXTENSION_ID, { type: BRIDGE_TYPE_GET_SIDE_PANEL_OPEN }, callbackFn);
export const responseGetSidePanelOpen = () =>
  Runtime.onMessageExternal(BRIDGE_TYPE_GET_SIDE_PANEL_OPEN, (_, __, sendResponse) => {
    sendResponse();
  });
