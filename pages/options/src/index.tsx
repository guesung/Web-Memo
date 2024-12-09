import '@extension/ui/dist/global.css';
import '@src/index.css';

import { initSentry } from '@extension/shared/utils';

initSentry();

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
}

init();
