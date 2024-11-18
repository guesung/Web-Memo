import { MemoTable } from '@src/types';
import { Tab } from '.';
import { formatUrl } from '../Url';

export interface GetFormattedMemoProps extends Pick<MemoTable['Insert'], 'memo'>, Pick<MemoTable['Insert'], 'isWish'> {}

export const getFormattedMemo = async ({
  memo = '',
  isWish = false,
}: GetFormattedMemoProps): Promise<MemoTable['Insert']> => {
  const tab = await Tab.get();

  if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

  return {
    title: tab.title,
    favIconUrl: tab?.favIconUrl,
    url: formatUrl(tab.url),
    memo,
    isWish,
  };
};
