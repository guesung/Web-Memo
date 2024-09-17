import { Runtime, Tab } from '../module';

export const BRIDGE_TYPE_PAGE_CONTENT = 'get-page-content';

/**
 * Tab에게 페이지 컨텐츠를 요청한다.
 */
export const requestPageContent = () => Tab.sendMessage(BRIDGE_TYPE_PAGE_CONTENT);

/**
 * Tab이 페이지 컨텐츠를 전달한다.
 */
export const responsePageContent = () =>
  Runtime.onMessage(BRIDGE_TYPE_PAGE_CONTENT, (_, __, sendResponse) => {
    sendResponse(document.body.innerText);
  });
