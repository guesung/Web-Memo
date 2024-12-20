import { ExtensionBridge } from '@extension/shared/modules/extension-bridge';
import { isProduction } from '@extension/shared/utils';
import { createRoot } from 'react-dom/client';

import { OpenSidePanelButton } from './components';

import { attachShadowTree } from './utils';

const renderOpenSidePanelButton = async () => {
  if (isProduction) return;

  attachShadowTree({
    shadowHostId: 'OPEN_SIDE_PANEL',
    shadowTree: <OpenSidePanelButton />,
  });
};

ExtensionBridge.responsePageContent();

renderOpenSidePanelButton();
