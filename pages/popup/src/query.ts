import { BRIDGE_TYPE_PAGE_CONTENT, BRIDGE_TYPE_SUMMARY, BridgeRequest } from '@extension/shared';

export const queryPageTextFromTab = () =>
  new Promise(resolve => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
      const [activeTab] = tabs;
      if (activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: BRIDGE_TYPE_PAGE_CONTENT } as BridgeRequest, response => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
          }
          if (response && response.content) {
            resolve(response.content);
          }
        });
      }
    });
  });

export const queryPageSummaryFromBackground = (pageText: string) =>
  new Promise(resolve => {
    let pageSummary = '';
    chrome.runtime.sendMessage(
      {
        type: BRIDGE_TYPE_SUMMARY,
        payload: {
          content: pageText,
        },
      } as BridgeRequest,
      response => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
        if (response && response.message) {
          pageSummary = response.message;
        }
        resolve(pageSummary);
      },
    );
  });
