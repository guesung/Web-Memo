import { Runtime, Tab } from './shared';

export const BRIDGE_TYPE_PAGE_CONTENT = 'get-page-content';
export const requestPageContent = () => Tab.sendMessage(BRIDGE_TYPE_PAGE_CONTENT);
export const responsePageContent = () => Runtime.onMessage(BRIDGE_TYPE_PAGE_CONTENT, document.body.innerText);
