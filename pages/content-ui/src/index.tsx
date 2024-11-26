import { isProduction } from '@extension/shared/utils';
import { OPEN_SIDE_PANEL_ID, responsePageContent } from '@extension/shared/utils/extension';
import { OpenSidePanelButton } from './components';
import { attachShadowTree } from './utils';

const renderOpenSidePanelButton = async () => {
  if (isProduction) return;

  attachShadowTree({
    shadowHostId: OPEN_SIDE_PANEL_ID,
    shadowTree: <OpenSidePanelButton />,
  });
};

responsePageContent();

renderOpenSidePanelButton();
