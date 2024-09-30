import { MAKE_WEBHOOK_NOTION_API } from '@extension/shared/constants';
import { MemoType } from '@extension/shared/types';
import { formatUrl } from '@extension/shared/utils';
import { getMemoSupabase, insertMemo, MemoStorage, Tab, updateMemo } from '@extension/shared/utils/extension';

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

  const response = await fetch(MAKE_WEBHOOK_NOTION_API, {
    method: 'POST',
    body: JSON.stringify(memoData),
  });
  return response;
};

export const saveMemoSupabase = async (memo: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { date, ...memoData } = await getMemoMetaData(memo);
  const { data: memoList } = await getMemoSupabase();

  const urlMatchMemo = memoList?.find(memo => memo.url === memoData.url);

  if (urlMatchMemo === undefined) await insertMemo(memoData);
  else await updateMemo(memoData);
};
