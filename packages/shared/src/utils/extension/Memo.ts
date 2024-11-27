import { MemoTable } from '@src/types';

import { formatUrl } from '../Url';
import { Tab } from '.';

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
