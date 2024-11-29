import { YoutubeTranscript } from 'youtube-transcript';

import { Runtime, Tab } from '../module';
export const BRIDGE_TYPE_PAGE_CONTENT = 'PAGE_CONTENT';

/**
 * Tab에게 페이지 컨텐츠를 요청한다.
 */
export const requestPageContent = () => Tab.sendMessage(BRIDGE_TYPE_PAGE_CONTENT);

const checkYoutube = (url: string) => url.startsWith('https://www.youtube.com/watch?');
const getContentFromWeb = () => document.body.innerText;
const getContentFromYoutube = async (url: string) => {
  const transcripts = await YoutubeTranscript.fetchTranscript(url);
  return transcripts.map(transcript => transcript.text).join('\n');
};
const getContent = async (url: string) => {
  if (checkYoutube(url)) return await getContentFromYoutube(url);
  return getContentFromWeb();
};

/**
 * Tab이 페이지 컨텐츠를 전달한다.
 */
export const responsePageContent = async () => {
  const url = location.href;
  const content = await getContent(url);

  Runtime.onMessage(BRIDGE_TYPE_PAGE_CONTENT, async (_, __, sendResponse) => {
    sendResponse(content);
  });
};
