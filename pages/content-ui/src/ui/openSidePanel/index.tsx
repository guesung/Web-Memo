import { isProduction } from '@web-memo/shared/utils';
import { attachShadowTree } from '../../utils';
import { OpenSidePanelButton } from './components';

export const renderOpenSidePanelButton = async () => {
	if (isProduction()) return;

	attachShadowTree({
		shadowHostId: "OPEN_SIDE_PANEL",
		shadowTree: <OpenSidePanelButton />,
	});
};