import { Tab } from '.';
import { formatUrl } from '../url';

export const getFormattedMemo = async (memo: string) => {
  const tab = await Tab.get();

  if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

  return {
    title: tab.title,
    memo,
    url: formatUrl(tab.url),
  };
};
