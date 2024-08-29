import { FloatingButton } from './components';
import { BRIDGE_TYPE_OPEN_SIDE_PANEL, BridgeRequest, BridgeResponse, responsePageTextFromTab } from '@extension/shared';

responsePageTextFromTab();
export default function App() {
  const handleSidePanelOpen = async () => {
    await chrome.runtime.sendMessage<BridgeRequest, BridgeResponse>({ type: BRIDGE_TYPE_OPEN_SIDE_PANEL });
  };

  return (
    <div data-theme="light">
      <FloatingButton onClick={handleSidePanelOpen} />
    </div>
  );
}
