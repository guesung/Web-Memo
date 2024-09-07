import { MemoStorage, Tab, urlToKey } from '@extension/shared';

export const saveMemoStorage = async (memo: string) => {
  const tab = await Tab.get();

  if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

  const urlKey = urlToKey(tab.url);

  await MemoStorage.set(urlKey, {
    title: tab.title,
    memo,
    date: new Date().toISOString(),
    url: tab.url,
  });
};

export const saveMemoNotion = async (memo: string) => {
  const tab = await Tab.get();

  if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

  const response = await fetch('https://hook.us1.make.com/rmm64d9ha1195geoecndznoj4pk8wxg5', {
    method: 'POST',
    body: JSON.stringify({
      title: tab.title,
      memo,
      date: new Date().toISOString(),
      url: tab.url,
    }),
  });
  console.log(response);
};
