import { YoutubeTranscript } from 'youtube-transcript';

import { Runtime, Tab } from '../module';
export const BRIDGE_TYPE_PAGE_CONTENT = 'PAGE_CONTENT';

/**
 * Tab에게 페이지 컨텐츠를 요청한다.
 */
export const requestPageContent = () => Tab.sendMessage(BRIDGE_TYPE_PAGE_CONTENT);

const checkYoutube = (url: string) => url.startsWith('https://www.youtube.com/watch?');
const getContent = () => document.body.innerText;
const getTranscript = async (url: string) => {
  const transcripts = await YoutubeTranscript.fetchTranscript(url);
  return transcripts.map(transcript => transcript.text).join('\n');
};

/**
 * Tab이 페이지 컨텐츠를 전달한다.
 */
export const responsePageContent = async () => {
  const url = location.href;
  const content = checkYoutube(url) ? await getTranscript(url) : getContent();
  Runtime.onMessage(BRIDGE_TYPE_PAGE_CONTENT, async (_, __, sendResponse) => {
    sendResponse(content);
  });
};
