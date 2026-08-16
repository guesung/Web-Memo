import { bridge } from "@web-memo/shared/modules/extension-bridge";
import {
	createHighlightRenderer,
	toHighlightItem,
} from "@web-memo/shared/modules/highlight";
import type { HighlightRow } from "@web-memo/shared/types";
import { attachShadowTree } from "../../utils";
import { HighlightTooltip } from "./HighlightTooltip";
import { startHighlightRestore } from "./restoreHighlights";

const TOOLTIP_HOST_ID = "WEB_MEMO_HIGHLIGHT_TOOLTIP";

/**
 * 현재 페이지의 하이라이트를 조회한다.
 * @description `chrome.runtime.sendMessage`는 수신 측이 없으면 promise를 reject한다
 * ("Could not establish connection", "Extension context invalidated"). 확장을 새로고침하면
 * 이미 열려 있던 탭의 content script가 고아가 되어 실제로 자주 일어난다. 잡지 않으면 남의
 * 웹페이지 콘솔에 unhandled rejection이 찍히므로, 실패를 조용히 빈 배열로 바꾼다.
 */
async function fetchHighlightRows(): Promise<HighlightRow[]> {
	try {
		const response = await bridge.request.GET_HIGHLIGHTS_BY_URL({
			url: window.location.href,
		});

		return response?.highlights ?? [];
	} catch {
		return [];
	}
}

/**
 * 현재 페이지의 하이라이트를 조회해 원문 위에 복원한다.
 * @description 조회는 background가 대신한다 — content script는 MV3에서 Supabase 세션에
 * 접근할 수 없다. 하이라이트가 없으면 옵저버도 마우스 리스너도 만들지 않고 즉시 끝낸다.
 * 사용자가 방문하는 페이지 대부분이 여기 해당하므로, 남의 사이트에 남기는 비용을 조회 한 번으로
 * 제한하는 것이 이 조기 종료의 목적이다.
 */
export async function setupHighlightRestore(): Promise<void> {
	const rows = await fetchHighlightRows();

	if (rows.length === 0) {
		return;
	}

	const renderer = createHighlightRenderer();

	startHighlightRestore({
		items: rows.map(toHighlightItem),
		renderer,
	});

	const notesById = new Map<number, string>();

	for (const row of rows) {
		if (row.note) {
			notesById.set(row.id, row.note);
		}
	}

	if (notesById.size === 0) {
		return;
	}

	attachShadowTree({
		shadowHostId: TOOLTIP_HOST_ID,
		shadowTree: (
			<HighlightTooltip
				hitTest={(x, y) => renderer.hitTest(x, y)}
				notesById={notesById}
			/>
		),
	});
}
