import { BRIDGE_TYPE_PAGE_CONTENT } from '../constants';
import { BridgeRequest, BridgeResponse } from '../types';

// Tab으로부터 페이지 텍스트를 가져온다.
export const queryPageTextFromTab = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const response = await chrome.tabs.sendMessage<BridgeRequest, BridgeResponse>(tab.id, {
      type: BRIDGE_TYPE_PAGE_CONTENT,
    });
    return response?.message;
  } catch (e) {
    throw new Error(e);
  }
};

export const responsePageTextFromTab = () => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === BRIDGE_TYPE_PAGE_CONTENT) {
      sendResponse({ message: document.body.innerText });
    }
  });
};
