export const keyToUrl = (key: string) => decodeURIComponent(key);
export const urlToKey = (url?: string) => {
  if (!url) return '';

  const urlWithoutFragment = url.split('#').at(0);

  if (!urlWithoutFragment) throw new Error('Invalid URL');

  return encodeURIComponent(urlWithoutFragment).slice(0, 255);
};