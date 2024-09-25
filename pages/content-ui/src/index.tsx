import { createRoot } from 'react-dom/client';
// eslint-disable-next-line
// @ts-ignore
import tailwindcssOutput from '@src/tailwind-output.css?inline';
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

interface AttachShadowTree {
  shadowTreeWrapper?: HTMLElement;
  shadowTree: JSX.Element;
  shadowHostId: string;
}

const attachShadowTree = ({ shadowTreeWrapper, shadowTree, shadowHostId }: AttachShadowTree) => {
  if (!shadowTreeWrapper) {
    shadowTreeWrapper = document.createElement('div');
    shadowTreeWrapper.id = shadowHostId;
    document.body.appendChild(shadowTreeWrapper);
  }

  const shadowRoot = shadowTreeWrapper.attachShadow({ mode: 'open' });

  const globalStyleSheet = new CSSStyleSheet();
  globalStyleSheet.replaceSync(tailwindcssOutput);
  shadowRoot.adoptedStyleSheets = [globalStyleSheet];

  createRoot(shadowRoot).render(shadowTree);
  return shadowRoot;
};

const renderMemoList = () => {
  const memoTableWrapper = document.getElementById(MEMO_TABLE_WRAPPER_ID);
  const memoTable = document.getElementById(MEMO_TABLE_ID);
  const isMemoPage = location.href === `${WEB_URL}/memo`;

  if (isMemoPage && memoTableWrapper && !memoTable) {
    attachShadowTree({
      shadowTreeWrapper: memoTableWrapper,
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
