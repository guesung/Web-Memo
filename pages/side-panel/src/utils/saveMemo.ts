import { MemoStorage, Tab, urlToKey } from '@extension/shared';

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

  const response = await fetch(import.meta.env.VITE_MAKE_WEBHOOK_NOTION_API, {
    method: 'POST',
    body: JSON.stringify(memoData),
  });
};
