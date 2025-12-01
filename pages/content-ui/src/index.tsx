import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { isProduction } from "@web-memo/shared/utils";
import { Suspense } from "react";
import {
	OpenSidePanelButton,
	QueryProvider,
	SelectionMemoButton,
} from "./components";
import { attachShadowTree } from "./utils";

const renderOpenSidePanelButton = async () => {
	if (isProduction()) return;

	attachShadowTree({
		shadowHostId: "OPEN_SIDE_PANEL",
		shadowTree: <OpenSidePanelButton />,
	});
};

const calculateButtonPosition = (
	selectionRect: DOMRect,
	buttonSize: { width: number; height: number },
): { top: number; left: number } => {
	const GAP = 8;
	const viewport = {
		width: window.innerWidth,
		height: window.innerHeight,
		scrollY: window.scrollY,
		scrollX: window.scrollX,
	};

	// Default: top-right of selection
	let top = selectionRect.top + viewport.scrollY - buttonSize.height - GAP;
	let left = selectionRect.right + viewport.scrollX + GAP;

	// Check right overflow
	if (left + buttonSize.width > viewport.width + viewport.scrollX) {
		// Move to left side
		left = selectionRect.left + viewport.scrollX - buttonSize.width - GAP;
	}

	// Check top overflow
	if (top < viewport.scrollY) {
		// Move below selection
		top = selectionRect.bottom + viewport.scrollY + GAP;
	}

	// Ensure minimum margins (8px)
	top = Math.max(viewport.scrollY + GAP, top);
	left = Math.max(GAP, Math.min(viewport.width - buttonSize.width - GAP, left));

	return { top, left };
};

const setupTextSelectionHandler = () => {
	let buttonRoot: ShadowRoot | null = null;

	document.addEventListener("mouseup", () => {
		const selection = window.getSelection();
		const text = selection?.toString().trim();

		if (buttonRoot) {
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

	// Also dismiss button when clicking outside
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
