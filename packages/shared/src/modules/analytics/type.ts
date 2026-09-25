import type { CONFIG } from "@web-memo/env";
import type { HighlightColor } from "../../constants/Highlight";
import type { ExportFormat } from "../../utils/Export";

declare global {
	interface Window {
		gtag: {
			(command: "event", action: string, parameters: IFGa4EventParams): void;
			/** 이후 모든 요청에 실을 값. 로그아웃은 null로 지웁니다. */
			(command: "set", parameters: { user_id: string | null }): void;
		};
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
 * 메모 카테고리를 바꾼 경로.
 * @description button은 사이드 패널의 칩·배지·해제 버튼, hash는 본문의 # 입력, ai는 AI 추천 자동
 * 적용입니다. "사람들이 #을 모른다"는 가정을 확인하려고 경로별 비율을 봅니다.
 */
export type TCategoryChangeSource = "button" | "hash" | "ai";

/**
 * 설치 버튼이 한 페이지 안에서 놓인 자리.
 *
 * @description 같은 페이지에 설치 버튼이 둘 이상이라 출발 경로만으로는 어느 버튼이 눌렸는지
 * 구분되지 않습니다. `extension_install_click`의 `position` 값입니다.
 */
export type TInstallClickPosition =
	| "hero"
	| "recommendation"
	| "final"
	| "install_check_dialog";

/**
 * 추적 가능한 이벤트 전체 목록.
 * @description 이름과 파라미터가 짝지어진 판별 유니온입니다. 로깅은 틀려도 화면이 깨지지 않아
 * 런타임에서 오류를 발견할 수 없으므로, 컴파일이 유일한 안전망입니다. 새 이벤트는 반드시
 * 여기에 멤버를 추가하고 EVENT_CATEGORY에도 분류를 넣어야 합니다.
 */
export type TAnalyticsEvent =
	| { name: "side_panel_open" }
	| { name: "page_view"; params: { page_title: string; page_location: string } }
	| { name: "memo_write"; params: { fields: string } }
	| { name: "memo_delete"; params: { memo_count: number } }
	| { name: "summary_run" }
	| { name: "summary_complete"; params: { duration_msec: number } }
	| { name: "chat_message_send" }
	| { name: "tab_change"; params: { tab_name: string } }
	| { name: "setting_change"; params: { setting_keys: string } }
	| { name: "memo_filter"; params: { search_target: string } }
	| { name: "youtube_transcript_extract"; params: { is_success: boolean } }
	| { name: "side_panel_open_click" }
	| { name: "highlight_note_update" }
	| { name: "login"; params: { method: string } }
	| { name: "memo_search"; params: { query_length: number } }
	| { name: "memo_open"; params: { has_search_query: boolean } }
	| { name: "memo_source_open" }
	| { name: "memo_restore"; params: { memo_count: number } }
	| { name: "memo_delete_permanently"; params: { memo_count: number } }
	| { name: "summary_fail"; params: { reason: string } }
	| { name: "chat_fail"; params: { reason: string } }
	| { name: "category_create" }
	| { name: "category_update" }
	| { name: "category_delete" }
	| { name: "feedback_submit" }
	| { name: "view_change"; params: { view: string } }
	| { name: "logout" }
	| { name: "extension_installed" }
	| { name: "login_start"; params: { method: string } }
	| { name: "side_panel_login_click" }
	| {
			name: "header_login_click";
			params: {
				/** 언어 접두사를 뺀 출발 경로. 예: "/introduce", "/features/memo" */
				from: string;
			};
	  }
	| {
			name: "header_memos_click";
			params: {
				/** 언어 접두사를 뺀 출발 경로. 예: "/introduce", "/memos/setting" */
				from: string;
			};
	  }
	| { name: "sign_up"; params: { method: string } }
	| {
			name: "memo_status_toggle";
			params: { status: "wish" | "star" | "reading"; enabled: boolean };
	  }
	| {
			name: "memo_category_change";
			params?: { source: TCategoryChangeSource };
	  }
	| { name: "memo_undo"; params: { action: "wish" | "reading" | "delete" } }
	| { name: "category_suggestion_show"; params: { is_new_category: boolean } }
	| { name: "category_suggestion_apply"; params: { is_new_category: boolean } }
	| {
			name: "extension_install_click";
			params: {
				/** 언어 접두사를 뺀 출발 경로. 예: "/features/memo", "/memos" */
				from: string;
				/** 한 페이지 안에서 누른 버튼의 자리 */
				position: TInstallClickPosition;
			};
	  }
	| { name: "extension_install_dismiss" }
	| {
			name: "open_web_from_extension";
			params: {
				from:
					| "side_panel_memo"
					| "side_panel_toast"
					| "side_panel_category"
					| "context_menu";
			};
	  }
	| { name: "guide_open"; params: { from: "context_menu" } }
	| { name: "guide_finish" }
	| { name: "extension_setting_change"; params: { keys: string } }
	| { name: "guide_step"; params: { step_name: string } }
	| { name: "memo_first_write" }
	| { name: "export_run"; params: { format: ExportFormat } }
	| { name: "search_no_result" }
	| {
			name: "highlight_create";
			params: { color: HighlightColor; has_note: boolean };
	  }
	| { name: "highlight_bubble_disable"; params: { scope: "site" | "all" } }
	| { name: "notice_view"; params: { notice_id: number } }
	| { name: "notice_dismiss"; params: { notice_id: number } }
	| {
			name: "past_memo_show";
			params: { kind: "duplicate" | "related"; source: "rule" | "jev" };
	  }
	| {
			name: "past_memo_open";
			params: { kind: "duplicate" | "related"; source: "rule" | "jev" };
	  }
	| {
			name: "past_memo_dismiss";
			params: { kind: "duplicate" | "related"; source: "rule" | "jev" };
	  };

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
	youtube_transcript_extract: "core_action",
	side_panel_open_click: "engagement",
	highlight_note_update: "core_action",
	login: "core_action",
	memo_search: "core_action",
	memo_open: "core_action",
	memo_source_open: "core_action",
	memo_restore: "core_action",
	memo_delete_permanently: "core_action",
	summary_fail: "core_action",
	chat_fail: "core_action",
	category_create: "core_action",
	category_update: "core_action",
	category_delete: "core_action",
	feedback_submit: "core_action",
	view_change: "engagement",
	logout: "engagement",
	extension_installed: "engagement",
	login_start: "engagement",
	side_panel_login_click: "engagement",
	header_login_click: "engagement",
	header_memos_click: "engagement",
	sign_up: "core_action",
	memo_status_toggle: "core_action",
	memo_category_change: "core_action",
	memo_undo: "engagement",
	category_suggestion_show: "engagement",
	category_suggestion_apply: "core_action",
	extension_install_click: "core_action",
	extension_install_dismiss: "engagement",
	open_web_from_extension: "engagement",
	guide_open: "engagement",
	guide_finish: "engagement",
	extension_setting_change: "engagement",
	guide_step: "engagement",
	memo_first_write: "core_action",
	export_run: "core_action",
	search_no_result: "engagement",
	highlight_create: "core_action",
	highlight_bubble_disable: "engagement",
	notice_view: "engagement",
	notice_dismiss: "engagement",
	past_memo_show: "engagement",
	past_memo_open: "core_action",
	past_memo_dismiss: "engagement",
};
