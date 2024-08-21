import { BRIDGE_TYPE_SUMMARY, BridgeRequest, BridgeResponse } from '@extension/shared';

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
