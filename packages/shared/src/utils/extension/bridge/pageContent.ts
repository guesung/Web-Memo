import { YoutubeTranscript } from 'youtube-transcript';

import { Runtime, Tab } from '../module';
export const BRIDGE_TYPE_PAGE_CONTENT = 'PAGE_CONTENT';

export type Category = 'youtube' | 'others';

/**
 * Tab에게 페이지 컨텐츠를 요청한다.
 */
export const requestPageContent = () =>
  Tab.sendMessage<void, { content: string; category: Category }>(BRIDGE_TYPE_PAGE_CONTENT);

const checkYoutube = (url: string) => url.startsWith('https://www.youtube.com/watch?');
const getCategory = (url: string): Category => {
  if (checkYoutube(url)) return 'youtube';
  return 'others';
};
const getContentFromWeb = () => document.body.innerText;
const getContentFromYoutube = async (url: string) => {
  const transcripts = await YoutubeTranscript.fetchTranscript(url);
  return transcripts.map(transcript => transcript.text).join('\n');
};
const getContent = async (url: string, category: Category) => {
  if (category === 'youtube') return await getContentFromYoutube(url);
  return getContentFromWeb();
};

/**
 * Tab이 페이지 컨텐츠를 전달한다.
 */
export const responsePageContent = async () => {
  const url = location.href;
  const category = getCategory(url);
  const content = await getContent(url, category);

  Runtime.onMessage(BRIDGE_TYPE_PAGE_CONTENT, async (_, __, sendResponse) => {
    sendResponse({ content, category });
    return true;
  });
};
