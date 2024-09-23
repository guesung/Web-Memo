import { Runtime, SidePanel, Tab } from '../module';

export const BRIDGE_TYPE_OPEN_SIDE_PANEL = 'OPEN_SIDE_PANEL';

/**
 * servicer worker에게 SidePanel을 열도록 요청한다.
 */
export const requestOpenSidePanel = () => Runtime.sendMessage(BRIDGE_TYPE_OPEN_SIDE_PANEL);

/**
 * servicer worker가 SidePanel을 연다.
 */
export const responseOpenSidePanel = async () => {
  await Runtime.onMessage(BRIDGE_TYPE_OPEN_SIDE_PANEL, async () => {
    const tab = await Tab.get();
    SidePanel.open(tab.id, tab.windowId);
  });
};
