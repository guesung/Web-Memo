import {
  BRIDGE_TYPE_OPEN_SIDE_PANEL,
  I18n,
  languageObject,
  OptionStorage,
  requestUpdateSidePanel,
  Storage,
  STORAGE_TYPE_OPTION_LANGUAGE,
} from '@extension/shared';
import { getPrompt } from '@root/utils';
import { openai } from '@root/utils/openai';
import 'webextension-polyfill';

// 확장 프로그램이 설치되었을 때 옵션을 초기화한다.
chrome.runtime.onInstalled.addListener(async () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  const language = await Storage.get(STORAGE_TYPE_OPTION_LANGUAGE);
  if (!language) Storage.set(STORAGE_TYPE_OPTION_LANGUAGE, languageObject[I18n.getUiLanguage()]);
});

// content-ui에서 메시지를 전달받아 사이드 패널을 연다.
chrome.runtime.onMessage.addListener((request, sender) => {
  console.log(1);
  console.log(request.type);
  if (request.type === BRIDGE_TYPE_OPEN_SIDE_PANEL) {
    console.log(sender.tab?.windowId);
    if (!sender.tab?.windowId) return;
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }
});

// chatGPT에게서 메시지를 받아서 다시 전달한다.
chrome.runtime.onConnect.addListener(async port => {
  port.onMessage.addListener(async message => {
    const language = (await OptionStorage.get()) ?? 'English';

    const prompt = getPrompt({ language });
    const pageContent = message.pageContent;
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: pageContent },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const message = chunk.choices[0]?.delta?.content;
      port.postMessage(message);
    }
  });
});

// 활성화된 탭이 변경되었을 때 사이드 패널을 업데이트한다.
chrome.tabs.onActivated.addListener(async () => {
  requestUpdateSidePanel();
});
// 페이지를 이동했을 때 사이드 패널을 업데이트한다.
chrome.tabs.onUpdated.addListener(async () => {
  requestUpdateSidePanel();
});
