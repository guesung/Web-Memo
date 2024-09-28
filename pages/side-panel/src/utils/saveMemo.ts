import { MAKE_WEBHOOK_NOTION_API } from '@extension/shared/constants';
import { urlToKey } from '@extension/shared/utils';
import { MemoStorage, Tab } from '@extension/shared/utils/extension';

const getMemoData = async (memo: string) => {
  const tab = await Tab.get();

  if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

  return {
    title: tab.title,
    memo,
    date: new Date().toISOString(),
    url: tab.url,
  };
};

export const saveMemoStorage = async (memo: string) => {
  const memoData = await getMemoData(memo);
  const urlKey = urlToKey(memoData.url);

  await MemoStorage.set(urlKey, memoData);
};

export const saveMemoNotion = async (memo: string) => {
  const memoData = await getMemoData(memo);

  const response = await fetch(MAKE_WEBHOOK_NOTION_API, {
    method: 'POST',
    body: JSON.stringify(memoData),
  });
  return response;
};
