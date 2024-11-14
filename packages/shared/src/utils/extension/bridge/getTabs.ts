import { Runtime, Tab } from '../module';

export const BRIDGE_TYPE_GET_TABS = 'GET_TABS';
export const requestGetTabs = () => {
  return Runtime.sendMessage<null, chrome.tabs.Tab>(BRIDGE_TYPE_GET_TABS);
};
export const responseGetTabs = async () => {
  const tabs = await Tab.get();

  Runtime.onMessage(BRIDGE_TYPE_GET_TABS, (_, __, sendResponse) => {
    sendResponse(tabs);
  });
};
