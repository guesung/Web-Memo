import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { attachShadowTree } from "../../utils";
import { FloatingPanel } from "./components";

const FLOATING_PANEL_HOST_ID = "WEB_MEMO_FLOATING_PANEL";

/**
 * background의 `TOGGLE_FLOATING_PANEL` 메시지를 받아 플로팅 패널을 토글한다.
 * @description 첫 토글에서만 마운트하고, 이후에는 호스트 요소의 표시 여부만 바꾼다.
 * iframe을 다시 만들면 side-panel 앱이 매번 새로 로딩되기 때문이다. 표시 제어를
 * `hidden` 속성이 아니라 `style.display`로 하는 이유는 페이지 CSS가 `[hidden]`을
 * 덮어쓸 수 있어서다.
 */
export const setupFloatingPanel = () => {
	let shadowHost: HTMLElement | null = null;

	const hidePanel = () => {
		if (!shadowHost) {
			return;
		}
		shadowHost.style.display = "none";
	};

	const togglePanel = () => {
		if (!shadowHost) {
			shadowHost = document.createElement("div");
			shadowHost.id = FLOATING_PANEL_HOST_ID;
			document.body.appendChild(shadowHost);

			attachShadowTree({
				shadowHostElement: shadowHost,
				shadowHostId: FLOATING_PANEL_HOST_ID,
				shadowTree: <FloatingPanel onCloseButtonClick={hidePanel} />,
			});
			return;
		}

		const isPanelHidden = shadowHost.style.display === "none";
		shadowHost.style.display = isPanelHidden ? "" : "none";
	};

	bridge.handle.TOGGLE_FLOATING_PANEL((_, __, sendResponse) => {
		togglePanel();
		// 응답 없이 끝나면 background 쪽 sendMessage가 "message port closed"로 reject될 수 있다.
		sendResponse();
	});
};
