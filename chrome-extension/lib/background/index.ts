import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import OpenAI from 'openai';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('background loaded');
console.log("Edit 'chrome-extension/lib/background/index.ts' and save to reload.");

const openai = new OpenAI({
  apiKey: '',
});

export type RequestType = {
  type: 'summarize';
  payload: {
    pageText: string;
  };
};

chrome.runtime.onMessage.addListener(async ({ type, payload: { pageText } }: RequestType, sender, sendResponse) => {
  if (type === 'summarize') {
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: 'Summarize This.' + pageText }],
      model: 'gpt-4o-mini',
    });
    const message = chatCompletion.choices[0].message.content;
    console.log(message);
    sendResponse({
      message,
    });
  }

  return true; // 비동기로 작업 시 필요
});
