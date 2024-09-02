import { BRIDGE_TYPE_OPEN_SIDE_PANEL } from './openSidePanel';
import { BRIDGE_TYPE_PAGE_CONTENT } from './pageContent';

export interface BridgeRequest {
  type: typeof BRIDGE_TYPE_OPEN_SIDE_PANEL | typeof BRIDGE_TYPE_PAGE_CONTENT;
  payload?: {
    content: string;
  };
}

export interface BridgeResponse {
  message: string;
}
