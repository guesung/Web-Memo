import { OPEN_SIDE_PANEL_ID, responsePageContent } from '@extension/shared/utils/extension';
import { isProduction } from '@extension/shared/utils';
import { attachShadowTree } from './utils';
import { OpenSidePanelButton } from './components';

const renderOpenSidePanelButton = async () => {
  console.log(isProduction);
  if (isProduction) return;

  attachShadowTree({
    shadowHostId: OPEN_SIDE_PANEL_ID,
    shadowTree: <OpenSidePanelButton />,
  });
};

responsePageContent();

renderOpenSidePanelButton();
