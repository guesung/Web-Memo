import { createRoot } from 'react-dom/client';
// eslint-disable-next-line
// @ts-ignore
import tailwindcssOutput from '@src/tailwind-output.css?inline';
import {
  MEMO_TABLE_ID,
  MEMO_TABLE_WRAPPER_ID,
  responseObserverMemoPage,
  responsePageContent,
  WEB_URL,
} from '@extension/shared';
import { MemoTable } from './components';

interface AttachShadowTree {
  shadowTree: JSX.Element;
  shadowHostId: string;
}

const attachShadowTree = ({ shadowTree, shadowHostId }: AttachShadowTree) => {
  const shadowHostParent = document.createElement('div');
  shadowHostParent.id = shadowHostId;
  document.body.appendChild(shadowHostParent);

  const shadowRoot = shadowHostParent.attachShadow({ mode: 'open' });

  const globalStyleSheet = new CSSStyleSheet();
  globalStyleSheet.replaceSync(tailwindcssOutput);
  shadowRoot.adoptedStyleSheets = [globalStyleSheet];

  createRoot(shadowRoot).render(shadowTree);
  return shadowRoot;
};

const initMemoList = () => {
  if (location.href !== `${WEB_URL}/memo`) return;

  const memoRoot = document.getElementById(MEMO_TABLE_WRAPPER_ID);
  const memoTable = document.getElementById(MEMO_TABLE_ID);

  if (!memoRoot || memoTable) return;

  attachShadowTree({
    shadowHostId: MEMO_TABLE_ID,
    shadowTree: <MemoTable />,
  });
};

responseObserverMemoPage(initMemoList);
initMemoList();

responsePageContent();
