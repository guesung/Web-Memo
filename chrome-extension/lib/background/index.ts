import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../../constants/env';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('background loaded');
console.log("Edit 'chrome-extension/lib/background/index.ts' and save to reload.");

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export type RequestType = {
  type: 'summarize';
  payload: {
    pageText: string;
  };
};

chrome.runtime.onMessage.addListener(async ({ type, payload: { pageText } }: RequestType, sender, sendResponse) => {
  console.log('message received');
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
