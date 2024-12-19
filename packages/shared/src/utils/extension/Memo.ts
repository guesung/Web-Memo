import { formatUrl } from '../Url';
import { Tab } from './module';

export const getMemoInfo = async () => {
  const tab = await Tab.get();

  if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

  return {
    title: tab.title,
    favIconUrl: tab?.favIconUrl,
    url: formatUrl(tab.url),
  };
};
