import { createRoot } from 'react-dom/client';
// eslint-disable-next-line
// @ts-ignore
import tailwindcssOutput from '@src/tailwind-output.css?inline';
import { responseObserverMemoPage, responsePageContent, WEB_URL } from '@extension/shared';
import { MemoTable } from './components';

const initMemoList = () => {
  if (location.href !== `${WEB_URL}/memo`) return;

  const memoRoot = document.getElementById('memo');
  const memoTable = document.getElementById('memo-table');
  if (!memoRoot || memoTable) return;

  document.body.append(memoRoot);
  const rootIntoShadow = document.createElement('div');
  rootIntoShadow.id = 'shadow-root';

  const shadowRoot = memoRoot.attachShadow({ mode: 'open' });

  const globalStyleSheet = new CSSStyleSheet();
  globalStyleSheet.replaceSync(tailwindcssOutput);
  shadowRoot.adoptedStyleSheets = [globalStyleSheet];

  shadowRoot.appendChild(rootIntoShadow);

  createRoot(rootIntoShadow).render(<MemoTable />);
};

initMemoList();
responsePageContent();
responseObserverMemoPage(initMemoList);
