export const isProduction = async () => {
  const self = await chrome.management.getSelf();
  return self.installType !== 'developement';
};
