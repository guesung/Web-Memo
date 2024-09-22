import { Runtime, Tab } from '../module';

export const BRIDGE_TYPE_OBSERVER_MEMO_PAGE = 'OBSERVER_MEMO_PAGE';
export const requestObserverMemoPage = () => Tab.sendMessage(BRIDGE_TYPE_OBSERVER_MEMO_PAGE);
export const responseObserverMemoPage = async (callbackFn: Parameters<typeof Runtime.onMessage>[1]) =>
  Runtime.onMessage(BRIDGE_TYPE_OBSERVER_MEMO_PAGE, callbackFn);
