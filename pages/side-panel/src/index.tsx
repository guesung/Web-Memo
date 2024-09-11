/* eslint-disable import/namespace */
import { initSentry } from '@extension/shared';
import '@extension/ui/dist/global.css';

import '@src/index.css';
import SidePanel from '@src/SidePanel';
import { createRoot } from 'react-dom/client';
initSentry();

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);
  root.render(<SidePanel />);
}

init();
