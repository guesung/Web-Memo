import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../../constants/env';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export type RequestType = {
  type: 'summarize';
  payload: {
    pageText: string;
  };
};

chrome.runtime.onMessage.addListener(async ({ type, payload }: RequestType, sender, sendResponse) => {
  console.log(1);
  if (type === 'summarize') {
    const { pageText } = payload;
    console.log(pageText);
    // const chatCompletion = await openai.chat.completions.create({
    //   messages: [{ role: 'user', content: 'Summarize This.'  }],
    //   model: 'gpt-4o-mini',
    // });
    // const message = chatCompletion.choices[0].message.content;
    // console.log(message);
    // sendResponse({
    //   message,
    // });
  }

  return true; // 비동기로 작업 시 필요
});
