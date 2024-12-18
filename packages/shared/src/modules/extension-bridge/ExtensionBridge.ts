import { EXTENSION } from '@src/constants';
import { Runtime, Tab } from '@src/utils/extension';
import { YoutubeTranscript } from 'youtube-transcript';

import { BRIDGE_MESSAGE_TYPES, Category } from './constant';

export default class ExtensionBridge {
  static requestGetSidePanelOpen(callbackFn: () => void) {
    chrome.runtime.sendMessage(EXTENSION.id, { type: BRIDGE_MESSAGE_TYPES.GET_SIDE_PANEL_OPEN }, callbackFn);
  }

  static responseGetSidePanelOpen() {
    Runtime.onMessageExternal(BRIDGE_MESSAGE_TYPES.GET_SIDE_PANEL_OPEN, (_, __, sendResponse) => {
      sendResponse();
    });
  }

  static requestOpenSidePanel() {
    return Runtime.sendMessage(BRIDGE_MESSAGE_TYPES.OPEN_SIDE_PANEL);
  }

  static responseOpenSidePanel() {
    chrome.runtime.onMessage.addListener((request, sender) => {
      if (request.type === BRIDGE_MESSAGE_TYPES.OPEN_SIDE_PANEL) {
        if (!sender.tab?.windowId) return;
        chrome.sidePanel.open({ windowId: sender.tab.windowId });
      }
    });
  }

  static requestGetTabs() {
    return Runtime.sendMessage<null, chrome.tabs.Tab>(BRIDGE_MESSAGE_TYPES.GET_TABS);
  }

  static async responseGetTabs() {
    const tabs = await Tab.get();

    Runtime.onMessage(BRIDGE_MESSAGE_TYPES.GET_TABS, (_, __, sendResponse) => {
      sendResponse(tabs);
    });
  }

  static requestPageContent() {
    return Tab.sendMessage<void, { content: string; category: Category }>(BRIDGE_MESSAGE_TYPES.PAGE_CONTENT);
  }

  private static checkYoutube(url: string) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
  }

  private static getCategory(url: string): Category {
    if (this.checkYoutube(url)) return 'youtube';
    return 'others';
  }

  private static getContentFromWeb() {
    return document.body.innerText;
  }

  private static async getContentFromYoutube(url: string) {
    const transcripts = await YoutubeTranscript.fetchTranscript(url);
    return transcripts.map(transcript => transcript.text).join('\n');
  }

  private static async getContent(url: string, category: Category) {
    if (category === 'youtube') return await this.getContentFromYoutube(url);
    return this.getContentFromWeb();
  }

  static async responsePageContent() {
    const url = location.href;
    const category = this.getCategory(url);
    const content = await this.getContent(url, category);

    Runtime.onMessage(BRIDGE_MESSAGE_TYPES.PAGE_CONTENT, async (_, __, sendResponse) => {
      sendResponse({ content, category });
      return true;
    });
  }

  static requestRefetchTheMemos() {
    return chrome.runtime.sendMessage(EXTENSION.id, {
      type: BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST,
    });
  }

  static responseRefetchTheMemos(callbackFn: () => void) {
    return Runtime.onMessageExternal(BRIDGE_MESSAGE_TYPES.REFETCH_THE_MEMO_LIST, callbackFn);
  }

  static requestUpdateSidePanel() {
    return Runtime.sendMessage(BRIDGE_MESSAGE_TYPES.UPDATE_SIDE_PANEL);
  }

  static responseUpdateSidePanel(callbackFn: Parameters<typeof Runtime.onMessage>[1]) {
    return Runtime.onMessage(BRIDGE_MESSAGE_TYPES.UPDATE_SIDE_PANEL, callbackFn);
  }
}