import { Tab } from '.';
import { formatUrl } from '../url';

export interface GetFormattedMemoProps {
  memo: string;
  category: string;
}

export const getFormattedMemo = async ({ memo, category }: GetFormattedMemoProps) => {
  const tab = await Tab.get();

  if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

  return {
    title: tab.title,
    memo,
    category,
    url: formatUrl(tab.url),
  };
};
