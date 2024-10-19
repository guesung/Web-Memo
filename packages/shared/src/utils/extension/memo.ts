import { Tab } from '.';
import { formatUrl } from '../Url';

export interface GetFormattedMemoProps {
  memo: string;
  category: string;
}

export const getFormattedMemo = async ({ memo, category }: GetFormattedMemoProps) => {
  const tab = await Tab.get();

  if (!tab.url) throw new Error('Save Failed: Invalid URL');

  return {
    title: tab.title,
    favIconUrl: tab?.favIconUrl,
    url: formatUrl(tab.url),
    memo,
    category,
  };
};
