import { updateMemo, MemoStorage, Tab, formatUrl, getMemo, MemoType, insertMemo } from '@extension/shared';
import { WEBHOOK_NOTION_API } from '@src/constants';

const getMemoMetaData = async (memo: string): Promise<MemoType> => {
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
  const memoData = await getMemoMetaData(memo);
  const urlKey = formatUrl(memoData.url);

  await MemoStorage.set(urlKey, memoData);
};

export const saveMemoNotion = async (memo: string) => {
  const memoData = await getMemoMetaData(memo);

  const response = await fetch(WEBHOOK_NOTION_API, {
    method: 'POST',
    body: JSON.stringify(memoData),
  });
  return response;
};

export const saveMemoSupabase = async (memo: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { date, ...memoData } = await getMemoMetaData(memo);
  const { data: memoList } = await getMemo();

  const urlMatchMemo = memoList?.find(memo => memo.url === memoData.url);

  if (urlMatchMemo === undefined) await insertMemo(memoData);
  else await updateMemo(memoData);
};
