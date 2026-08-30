import type { CONFIG } from "@web-memo/env";

declare global {
	interface Window {
		gtag: (
			command: "event",
			action: string,
			parameters: IFGa4EventParams,
		) => void;
	}
}

/** 이벤트 분류. GA4의 event_category로 전송됩니다. */
export type TEventCategory = "engagement" | "core_action";

/**
 * GA4로 실제 전송되는 파라미터.
 * @description 호출부가 넘긴 이벤트별 파라미터에 전송 계층이 공통 파라미터를 얹은 결과입니다.
 */
export interface IFGa4EventParams {
	event_category: TEventCategory;
	engagement_time_msec: number;
	/** 어느 빌드 환경에서 발생한 이벤트인지. staging 트래픽을 운영 지표에서 걸러내는 기준입니다. */
	build_env: (typeof CONFIG)["buildEnv"];
	/** staging에서만 붙습니다. GA4 DebugView에 실시간으로 표시됩니다. */
	debug_mode?: true;
	user_id?: string;
	session_id?: string;
	[key: string]: unknown;
}

/**
 * 추적 가능한 이벤트 전체 목록.
 * @description 이름과 파라미터가 짝지어진 판별 유니온입니다. 로깅은 틀려도 화면이 깨지지 않아
 * 런타임에서 오류를 발견할 수 없으므로, 컴파일이 유일한 안전망입니다. 새 이벤트는 반드시
 * 여기에 멤버를 추가하고 EVENT_CATEGORY에도 분류를 넣어야 합니다.
 */
export type TAnalyticsEvent =
	| { name: "side_panel_open" }
	| { name: "page_view"; params: { page_title: string; page_location: string } }
	| { name: "memo_write" }
	| { name: "memo_delete"; params: { memo_count: number } }
	| { name: "summary_run" }
	| { name: "summary_complete"; params: { duration_msec: number } }
	| { name: "chat_message_send" }
	| { name: "tab_change"; params: { tab_name: string } }
	| { name: "setting_change"; params: { setting_keys: string } }
	| { name: "memo_filter"; params: { search_target: string } };

/** 이벤트 이름만 추린 유니온. */
export type TAnalyticsEventName = TAnalyticsEvent["name"];

/**
 * 이벤트별 GA4 분류.
 * @description Record로 선언해 이벤트를 추가하고 여기에 넣지 않으면 컴파일이 실패하게 합니다.
 */
export const EVENT_CATEGORY: Record<TAnalyticsEventName, TEventCategory> = {
	side_panel_open: "engagement",
	page_view: "engagement",
	memo_write: "core_action",
	memo_delete: "core_action",
	summary_run: "core_action",
	summary_complete: "core_action",
	chat_message_send: "core_action",
	tab_change: "engagement",
	setting_change: "engagement",
	memo_filter: "engagement",
};
