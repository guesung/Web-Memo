import { requestOpenSidePanel } from '@extension/shared';

export default function App() {
  return (
    <button id="open-side-panel" onClick={requestOpenSidePanel}>
      버튼
    </button>
  );
}
