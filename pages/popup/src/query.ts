import { BRIDGE_TYPE_PAGE_CONTENT, BRIDGE_TYPE_SUMMARY, BridgeRequest, BridgeResponse } from '@extension/shared';

export const queryPageTextFromTab = (): Promise<string> =>
  new Promise(resolve => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
      const [activeTab] = tabs;
      if (activeTab.id) {
        chrome.tabs.sendMessage<BridgeRequest, BridgeResponse>(
          activeTab.id,
          { type: BRIDGE_TYPE_PAGE_CONTENT },
          response => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError);
              return;
            }
            if (response && response.message) {
              resolve(response.message);
            }
          },
        );
      }
    });
  });

export const queryPageSummaryFromBackground = (pageText: string): Promise<string> =>
  new Promise(resolve => {
    let pageSummary = '';
    chrome.runtime.sendMessage<BridgeRequest, BridgeResponse>(
      {
        type: BRIDGE_TYPE_SUMMARY,
        payload: {
          content: pageText,
        },
      },
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
