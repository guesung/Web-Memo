import { Runtime } from './shared';

export const BRIDGE_TYPE_UPDATE_SIDE_PANEL = 'update-side-panel';
export const requestUpdateSidePanel = () => Runtime.sendMessage(BRIDGE_TYPE_UPDATE_SIDE_PANEL);
export const responseUpdateSidePanel = async (callbackFn: Parameters<typeof Runtime.onMessage>[1]) =>
  Runtime.onMessage(BRIDGE_TYPE_UPDATE_SIDE_PANEL, callbackFn);
