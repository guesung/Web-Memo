import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";

export default function OpenSidePanelButton() {
	const handleButtonClick = () => {
		analytics.trackEvent({ name: "side_panel_open_click" });
		bridge.request.OPEN_SIDE_PANEL();
	};

	return (
		<button
			className="fixed bottom-4 left-4 z-50 flex h-1 w-1 items-center justify-center rounded-full bg-transparent shadow-lg "
			type="button"
			id="OPEN_SIDE_PANEL_BUTTON"
			onClick={handleButtonClick}
		/>
	);
}
