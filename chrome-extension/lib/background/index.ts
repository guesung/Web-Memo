import 'webextension-polyfill';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../../constants';
import { BRIDGE_TYPE_SUMMARY, BridgeRequest, BridgeResponse } from '@extension/shared';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const prompt = `
You are a professional summarizer. Please read the page content I provide and summarize it concisely according to the following format:
\`\`\`
### Key Themes of This Text
1. [First main theme]
2. [Second main theme]
3. [Third main theme]

### Action Items
1. [First action item]
2. [Second action item]

Guidelines:
1. For Key Themes, list the 3 most important points of the text.
2. For Action Items, write 2 main action steps or next steps suggested in the text.
3. Write all content in Korean.
4. Use concise and clear sentences.
\`\`\`
Please follow the provided format exactly.
`;

export type RequestType = {
  type: 'summarize';
  payload: {
    pageText: string;
  };
};

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
        console.log(chatCompletion);
        const message = chatCompletion.choices[0].message.content;
        sendResponse({
          message,
        } as BridgeResponse);
      });
  }
  return true;
});
