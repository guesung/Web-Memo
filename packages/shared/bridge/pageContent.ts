import { BridgeRequest, BridgeResponse } from './type';

export const BRIDGE_TYPE_PAGE_CONTENT = 'get-page-content';
export const getPageContent = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const response = chrome.tabs.sendMessage<BridgeRequest, BridgeResponse>(tab.id, {
      type: BRIDGE_TYPE_PAGE_CONTENT,
    });
    return response?.message;
  } catch (e) {
    throw new Error(e);
  }
};

export const sendPageContent = () => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === BRIDGE_TYPE_PAGE_CONTENT) {
      sendResponse({ message: document.body.innerText });
    }
  });
};
