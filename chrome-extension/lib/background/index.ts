import { BRIDGE_TYPE_OPEN_SIDE_PANEL, BridgeRequest } from '@extension/shared';
import { PROMPT } from '@root/constants';
import { openai } from '@root/utils/openai';
import 'webextension-polyfill';

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setOptions({
    path: 'side-panel/index.html',
    enabled: true,
  });
});

chrome.runtime.onMessage.addListener((bridgeResponse: BridgeRequest, sender) => {
  (async () => {
    if (!sender.tab) return;
    if (bridgeResponse.type === BRIDGE_TYPE_OPEN_SIDE_PANEL) {
      await chrome.sidePanel.open({ windowId: sender.tab.windowId });
    }
  })();
});

chrome.runtime.onConnect.addListener(async port => {
  port.onMessage.addListener(async message => {
    const pageContent = message.pageContent;
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: PROMPT + pageContent }],
      stream: true,
    });

    for await (const chunk of stream) {
      const message = chunk.choices[0]?.delta?.content;
      if (message === undefined) port.disconnect();

      port.postMessage(message);
    }
  });
});
