export const getIsProduction = async () => {
  const self = await chrome.management.getSelf();
  return self.installType !== 'development';
};
