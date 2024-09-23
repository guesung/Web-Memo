import { createRoot } from 'react-dom/client';
// eslint-disable-next-line
// @ts-ignore
import tailwindcssOutput from '@src/tailwind-output.css?inline';
import { responseObserverMemoPage, responsePageContent, WEB_URL } from '@extension/shared';
import { MemoTable } from './components';

interface AttachShadowTree {
  shadowHost: HTMLElement;
  shadowTree: JSX.Element;
}

const attachShadowTree = ({ shadowHost, shadowTree }: AttachShadowTree) => {
  const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  const globalStyleSheet = new CSSStyleSheet();
  globalStyleSheet.replaceSync(tailwindcssOutput);
  shadowRoot.adoptedStyleSheets = [globalStyleSheet];

  createRoot(shadowRoot).render(shadowTree);
};

const initMemoList = () => {
  if (location.href !== `${WEB_URL}/memo`) return;

  const memoRoot = document.getElementById('memo');
  const memoTable = document.getElementById('memo-table');

  if (!memoRoot || memoTable) return;

  attachShadowTree({
    shadowHost: memoRoot,
    shadowTree: <MemoTable />,
  });
};

initMemoList();
responsePageContent();
responseObserverMemoPage(initMemoList);
