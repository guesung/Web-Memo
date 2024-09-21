import { createRoot } from 'react-dom/client';
// eslint-disable-next-line
// @ts-ignore
import tailwindcssOutput from '@src/tailwind-output.css?inline';
import { responsePageContent } from '@extension/shared';
import { MemoTable } from './components';

const memoRoot = document.getElementById('memo');

if (memoRoot) {
  document.body.append(memoRoot);
  const rootIntoShadow = document.createElement('div');
  rootIntoShadow.id = 'shadow-memo-root';

  const shadowRoot = memoRoot.attachShadow({ mode: 'open' });

  const globalStyleSheet = new CSSStyleSheet();
  globalStyleSheet.replaceSync(tailwindcssOutput);
  shadowRoot.adoptedStyleSheets = [globalStyleSheet];

  responsePageContent();

  shadowRoot.appendChild(rootIntoShadow);

  createRoot(rootIntoShadow).render(<MemoTable />);
}
