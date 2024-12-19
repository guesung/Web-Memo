import { ExtensionBridge } from '@extension/shared/modules/extension-bridge';
import { isProduction } from '@extension/shared/utils';
import { createRoot } from 'react-dom/client';

import { OpenSidePanelButton } from './components';

const root = document.createElement('div');
root.id = 'page-summary-content-ui';
document.body.appendChild(root);

createRoot(root).render(<OpenSidePanelButton />);

if (!isProduction) {
  ExtensionBridge.responsePageContent();
}

const cleanup = () => {
  root.remove();
};

window.addEventListener('unload', cleanup);
