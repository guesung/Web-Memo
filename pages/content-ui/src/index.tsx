import { MemoTable, OpenSidePanelButton } from './components';
import { attachShadowTree } from './utils';
import { MEMO_TABLE_ID, MEMO_TABLE_WRAPPER_ID, WEB_URL } from '@extension/shared/constants';
import { OPEN_SIDE_PANEL_ID, responseObserverMemoPage, responsePageContent } from '@extension/shared/utils/extension';
import { isProduction } from '@extension/shared/utils';

const renderMemoList = () => {
  const memoTableWrapper = document.getElementById(MEMO_TABLE_WRAPPER_ID) ?? document.getElementById('memo');
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
  // const isCIEnvironment = process.env.CI;
  // CI 환경이거나, 개발 환경에서만 보여준다.
  // if (isCIEnvironment || !isProduction) {
  attachShadowTree({
    shadowHostId: OPEN_SIDE_PANEL_ID,
    shadowTree: <OpenSidePanelButton />,
  });
  // }
};

responseObserverMemoPage(renderMemoList);
renderMemoList();
renderOpenSidePanelButton();

responsePageContent();
