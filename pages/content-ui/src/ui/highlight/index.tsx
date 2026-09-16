import { createHighlightRenderer } from "@web-memo/shared/modules/highlight";
import sharedThemeStyles from "@web-memo/ui/global.css?inline";
import { attachShadowTree } from "../../utils";
import { HighlightSelectionToolbar } from "./HighlightSelectionToolbar";
import { HighlightTooltip } from "./HighlightTooltip";

/** 첫 생성 UI를 즉시 마운트하고 복원과 생성이 하나의 렌더러를 공유하도록 초기화한다. */
export const setupHighlightRestore = async (): Promise<void> => {
	try {
		const renderer = createHighlightRenderer();
		const notesById = new Map<number, string>();
		const shadowRoot = attachShadowTree({
			shadowHostId: "WEB_MEMO_HIGHLIGHT_TOOLTIP",
			shadowTree: (
				<>
					<HighlightSelectionToolbar
						renderer={renderer}
						notesById={notesById}
					/>
					<HighlightTooltip
						hitTest={(x, y) => renderer.hitTest(x, y)}
						notesById={notesById}
					/>
				</>
			),
		});
		/** 공용 토큰의 :root는 ShadowRoot에 존재하지 않아 :host로 적용한다. */
		const themeSheet = new CSSStyleSheet();
		themeSheet.replaceSync(sharedThemeStyles.replaceAll(":root", ":host"));
		shadowRoot.adoptedStyleSheets = [
			themeSheet,
			...shadowRoot.adoptedStyleSheets,
		];
	} catch {
		/** 다른 웹페이지에 주입되는 UI의 초기화 실패는 페이지 동작을 막지 않는다. */
	}
};
