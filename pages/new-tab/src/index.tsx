import { createRoot } from 'react-dom/client';
import '@src/index.css';
import '@extension/ui/lib/global.css';
import NewTab from '@src/NewTab';
import { initSentry } from '@extension/shared';

initSentry(import.meta.env.VITE_SENTRY_DSN);

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);

  root.render(<NewTab />);
}

init();
