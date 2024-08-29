import 'webextension-polyfill';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../../constants';
import { BRIDGE_TYPE_OPEN_SIDE_PANEL, BRIDGE_TYPE_SUMMARY, BridgeRequest, BridgeResponse } from '@extension/shared';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const prompt = `
Language: Please write in 한국어 language! Please write in 한국어 language!Please write in 한국어 language!

Instructions:Please answer within 200-800 characters. Your task is to summarize the video content using the provided subtitles. Your output should use the following template:
#### Summary
{Summarize the video content in one sentence, ensuring it's no more than 30 words.}
#### Highlights
{Provide 5 highlights, starting with a summarizing phrase. }

`;

// chatGPT 응답을 받아서 다시 content script로 전달
chrome.runtime.onMessage.addListener((bridgeResponse: BridgeRequest, sender, sendResponse) => {
  const { type, payload } = bridgeResponse;
  if (type === BRIDGE_TYPE_SUMMARY && payload && payload.content) {
    const { content } = payload;
    openai.chat.completions
      .create({
        messages: [{ role: 'user', content: prompt + content }],
        model: 'gpt-4o-mini',
      })
      .then(chatCompletion => {
        const message = chatCompletion.choices[0].message.content;
        sendResponse({
          message,
        } as BridgeResponse);
      });
  }
  return true;
});

chrome.runtime.onMessage.addListener((bridgeResponse: BridgeRequest, sender, sendResponse) => {
  (async () => {
    if (bridgeResponse.type === BRIDGE_TYPE_OPEN_SIDE_PANEL) {
      await chrome.sidePanel.open({ tabId: sender.tab.id });
      await chrome.sidePanel.setOptions({
        tabId: sender.tab.id,
        path: 'side-panel/index.html',
        enabled: true,
      });
    }
  })();
});
