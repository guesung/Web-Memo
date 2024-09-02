export const urlToKey = (url: string) => {
  const urlWithoutFragment = url.split('#').at(0);

  if (!urlWithoutFragment) throw new Error('Invalid URL');

  return encodeURIComponent(urlWithoutFragment).slice(0, 255);
};
