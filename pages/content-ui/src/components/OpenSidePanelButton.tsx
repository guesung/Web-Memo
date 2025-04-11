import { ExtensionBridge } from '@extension/shared/modules/extension-bridge';

export default function OpenSidePanelButton() {
  return (
    <button
      className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-50"
      type="button"
      id="OPEN_SIDE_PANEL_BUTTON"
      onClick={ExtensionBridge.requestOpenSidePanel}>
      <img alt="logo" className="h-6 w-6" src="/icons/icon-48.png" />
    </button>
  );
}
