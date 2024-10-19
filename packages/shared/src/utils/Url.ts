export const formatUrl = (url?: string) => {
  if (!url) return '';

  const urlWithoutFragment = url.split('#').at(0);

  if (!urlWithoutFragment) throw new Error('Invalid URL');

  return urlWithoutFragment;
};
