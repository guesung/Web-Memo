import { MemoType } from '@src/types';
import { Tab } from '.';

export const getFormattedMemo = async (memo: string): Promise<MemoType> => {
  const tab = await Tab.get();

  if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

  return {
    title: tab.title,
    memo,
    date: new Date().toISOString(),
    url: tab.url,
  };
};
