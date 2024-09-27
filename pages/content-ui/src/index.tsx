import {
  isProduction,
  MEMO_TABLE_ID,
  MEMO_TABLE_WRAPPER_ID,
  OPEN_SIDE_PANEL_ID,
  responseObserverMemoPage,
  responsePageContent,
  WEB_URL,
} from '@extension/shared';
import { MemoTable, OpenSidePanelButton } from './components';
import { attachShadowTree } from './utils';

const renderMemoList = () => {
  const memoTableWrapper = document.getElementById(MEMO_TABLE_WRAPPER_ID);
  const memoTable = document.getElementById(MEMO_TABLE_ID);
  const isMemoPage = location.href === `${WEB_URL}/memo`;

  if (isMemoPage && memoTableWrapper && !memoTable) {
    attachShadowTree({
      shadowHostElement: memoTableWrapper,
      shadowHostId: MEMO_TABLE_ID,
      shadowTree: <MemoTable />,
    });
  }
};

const renderOpenSidePanelButton = async () => {
  if (isProduction) return;

  attachShadowTree({
    shadowHostId: OPEN_SIDE_PANEL_ID,
    shadowTree: <OpenSidePanelButton />,
  });
};

responseObserverMemoPage(renderMemoList);
renderMemoList();
renderOpenSidePanelButton();

responsePageContent();
