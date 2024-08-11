import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import OpenAI from 'openai';
import { OPENAI_API_KEY, MOCK_OPEN_AI_API_RESPONSE } from '../../constants';

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
  if (type === 'summarize') {
    // const { pageText } = payload;
    // console.log(pageText);
    // const chatCompletion = await openai.chat.completions.create({
    //   messages: [{ role: 'user', content: '아래 내용을 요약해줘.' + pageText }],
    //   model: 'gpt-4o-mini',
    // });
    // const message = chatCompletion.choices[0].message.content;
    // sendResponse({
    //   message,
    // });
    return MOCK_OPEN_AI_API_RESPONSE;
  }

  return true; // 비동기로 작업 시 필요
});
