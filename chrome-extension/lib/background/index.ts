import { LANGUAGE_MAP, URL_FORM, URL_GUIDE_EN, URL_GUIDE_KO, WEB_URL } from '@extension/shared/constants';
import { isProduction } from '@extension/shared/utils';
import {
  I18n,
  OptionStorage,
  requestObserverMemoPage,
  requestUpdateSidePanel,
  responseOpenSidePanel,
  Storage,
  STORAGE_TYPE_OPTION_LANGUAGE,
  Tab,
} from '@extension/shared/utils/extension';
import { getPrompt } from '@root/utils';
import { openai } from '@root/utils/openai';
import 'webextension-polyfill';

// 확장 프로그램이 설치되었을 때 옵션을 초기화한다.
chrome.runtime.onInstalled.addListener(async () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  const language = await Storage.get(STORAGE_TYPE_OPTION_LANGUAGE);
  if (!language) Storage.set(STORAGE_TYPE_OPTION_LANGUAGE, LANGUAGE_MAP[I18n.getUILanguage()]);
});

// 확장 프로그램이 설치되었을 때 가이드 페이지로 이동한다.
chrome.runtime.onInstalled.addListener(async () => {
  if (!isProduction) return;
  const lang = I18n.getUILanguage();
  if (lang === 'ko') Tab.create({ url: URL_GUIDE_KO });
  else Tab.create({ url: URL_GUIDE_EN });
});

// 확장 프로그램이 설치되었을 때 contextMenus를 설정한다.
const CONTEXT_MENU_ID_CHECK_MEMO = 'CONTEXT_MENU_ID_CHECK_MEMO';
const CONTEXT_MENU_ID_SHOW_GUIDE = 'CONTEXT_MENU_ID_SHOW_GUIDE';
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    title: I18n.get('context_menus_check_memo'),
    id: CONTEXT_MENU_ID_CHECK_MEMO,
    contexts: ['all'],
  });
  chrome.contextMenus.create({
    title: I18n.get('context_menus_show_guide'),
    id: CONTEXT_MENU_ID_SHOW_GUIDE,
    contexts: ['all'],
  });
});

// contextMenus 각 항목을 누를 때 해당하는 페이지로 이동한다.
if (chrome.contextMenus)
  chrome.contextMenus.onClicked.addListener(async item => {
    switch (item.menuItemId) {
      case CONTEXT_MENU_ID_CHECK_MEMO:
        await Tab.create({ url: `${WEB_URL}/memo` });
        break;
      case CONTEXT_MENU_ID_SHOW_GUIDE:
        if (I18n.getUILanguage() === 'ko') Tab.create({ url: URL_GUIDE_KO });
        else Tab.create({ url: URL_GUIDE_EN });
        break;
    }
  });

chrome.runtime.setUninstallURL(URL_FORM);

// chatGPT에게서 메시지를 받아서 다시 전달한다.
chrome.runtime.onConnect.addListener(async port => {
  port.onMessage.addListener(async message => {
    const language = (await OptionStorage.get(STORAGE_TYPE_OPTION_LANGUAGE)) ?? 'English';

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

chrome.tabs.onActivated.addListener(async () => {
  // 활성화된 탭이 변경되었을 때 사이드 패널을 업데이트한다.
  requestUpdateSidePanel();
});
chrome.tabs.onUpdated.addListener(async () => {
  // 페이지를 이동했을 때 사이드 패널을 업데이트한다.
  requestUpdateSidePanel();
  // 페이지를 이동했을 때 메모를 보여주는 페이지인지 체크한다.
  requestObserverMemoPage();
});

// content-ui에서 메시지를 전달받아 사이드 패널을 연다.
responseOpenSidePanel();
