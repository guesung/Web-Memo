import { PROMPT } from '@root/constants';
import { openai } from '@root/utils/openai';
import 'webextension-polyfill';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  // chrome.contextMenus.create({
  //   id: 'openSidePanel',
  //   title: '사이드 패널 열기',
  //   contexts: ['all'],
  // });
  // chrome.tabs.create({ url: 'page.html' });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openSidePanel',
    title: 'Open side panel',
    contexts: ['all'],
  });
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
      port.postMessage(message);
    }
  });
});
