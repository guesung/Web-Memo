import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../../constants';
import { BRIDGE_TYPE_SUMMARY } from '@extension/shared';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const prompt = `
I will provide you with all the content currently on this page. Please summarize the entire page for me.

Create a summary that captures the essential information in a clean, organized Markdown format. Focus on the key points and main ideas, presenting them in a concise yet comprehensive manner. Use appropriate Markdown elements such as headers, bullet points, or numbered lists to structure the summary logically.

Ensure that your summary:
1. Covers all major topics or sections from the original content
2. Highlights the most important information
3. Is easy to read and understand
4. Uses clear and concise language
5. Maintains the original meaning and intent of the content
6. Tell me in Korean.

Please begin your summary once I've shared the page content with you.
`;

export type RequestType = {
  type: 'summarize';
  payload: {
    pageText: string;
  };
};

chrome.runtime.onMessage.addListener(({ type, payload }, sender, sendResponse) => {
  console.log(payload);
  if (type === BRIDGE_TYPE_SUMMARY) {
    const { content } = payload;
    openai.chat.completions
      .create({
        messages: [{ role: 'user', content: prompt + content }],
        model: 'gpt-4o-mini',
      })
      .then(chatCompletion => {
        console.log(chatCompletion);
        const message = chatCompletion.choices[0].message.content;
        sendResponse({
          message,
        });
      });
  }
  return true;
});
