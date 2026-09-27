import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";

/** 기존 패널 열기 진입점에서 브리지 요청을 보낸다. */
const OpenSidePanelButton = () => {
	const handleOpenSidePanelButtonClick = async () => {
		analytics.trackEvent({ name: "side_panel_open_click" });
		try {
			await bridge.request.OPEN_SIDE_PANEL();
		} catch {
			/** 브리지가 실패를 기록하며 호스트 페이지에는 오류를 전파하지 않는다. */
		}
	};

	return (
		<button
			className="fixed bottom-4 left-4 z-50 flex h-1 w-1 items-center justify-center rounded-full bg-transparent shadow-lg "
			type="button"
			id="OPEN_SIDE_PANEL_BUTTON"
			onClick={handleOpenSidePanelButtonClick}
		/>
	);
};

export default OpenSidePanelButton;
