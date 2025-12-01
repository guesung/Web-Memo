import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { isProduction } from "@web-memo/shared/utils";
import { Suspense } from "react";
import {
	OpenSidePanelButton,
	QueryProvider,
	SelectionMemoButton,
} from "./components";
import { attachShadowTree } from "./utils";
import { calculateButtonPosition } from "./utils/calculateButtonPosition";

const renderOpenSidePanelButton = async () => {
	if (isProduction()) return;

	attachShadowTree({
		shadowHostId: "OPEN_SIDE_PANEL",
		shadowTree: <OpenSidePanelButton />,
	});
};

const setupTextSelectionHandler = () => {
	let buttonRoot: ShadowRoot | null = null;

	document.addEventListener("mouseup", (event) => {
		const selection = window.getSelection();
		const text = selection?.toString().trim();

		if (buttonRoot) {
			if (buttonRoot.host.contains(event.target as Node)) return;

			buttonRoot.host.remove();
			buttonRoot = null;
		}

		if (!text || text.length < 3) return;

		const activeElement = document.activeElement;
		if (
			activeElement?.tagName === "INPUT" ||
			activeElement?.tagName === "TEXTAREA" ||
			(activeElement as HTMLElement)?.isContentEditable
		) {
			return;
		}

		if (!selection || selection.rangeCount === 0) return;
		const range = selection.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		const position = calculateButtonPosition(rect, { width: 40, height: 40 });

		buttonRoot = attachShadowTree({
			shadowTree: (
				<QueryProvider>
					<Suspense>
						<SelectionMemoButton selectedText={text} position={position} />
					</Suspense>
				</QueryProvider>
			),
			shadowHostId: "WEB_MEMO_SELECTION_BUTTON",
		});
	});

	document.addEventListener("mousedown", (e) => {
		if (buttonRoot && !buttonRoot.host.contains(e.target as Node)) {
			buttonRoot.host.remove();
			buttonRoot = null;
		}
	});
};

ExtensionBridge.responsePageContent();

renderOpenSidePanelButton();
setupTextSelectionHandler();
