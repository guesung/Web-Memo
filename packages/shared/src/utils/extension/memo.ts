import { Tab } from '.';
import { formatUrl } from '../url';

export interface GetFormattedMemoProps {
  memo: string;
  category: string;
}

export const getFormattedMemo = async ({ memo, category }: GetFormattedMemoProps) => {
  const tab = await Tab.get();

  if (!tab.url || !tab.title || !tab.favIconUrl) throw new Error('Save Failed: Invalid URL');

  return {
    title: tab.title,
    favIconUrl: tab.favIconUrl,
    url: formatUrl(tab.url),
    memo,
    category,
  };
};
