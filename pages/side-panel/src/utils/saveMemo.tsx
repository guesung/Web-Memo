import { MemoType, Storage, Tab, urlToKey } from '@extension/shared';

export const saveMemo = async (memo: string) => {
  const tab = await Tab.get();

  if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

  const urlKey = urlToKey(tab.url);

  await Storage.set<MemoType>(urlKey, {
    title: tab.title,
    memo,
    date: new Date().toISOString(),
    url: tab.url,
  });
};
