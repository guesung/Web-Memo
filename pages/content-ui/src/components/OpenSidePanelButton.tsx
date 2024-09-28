import { requestOpenSidePanel } from '@extension/shared/utils/extension';

export default function OpenSidePanelButton() {
  return (
    <button id="open-side-panel" onClick={requestOpenSidePanel}>
      버튼
    </button>
  );
}
