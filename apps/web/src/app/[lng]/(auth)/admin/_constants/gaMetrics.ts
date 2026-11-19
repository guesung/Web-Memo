/** 매일 보는 지표 카드. 순서가 그대로 카드 순서다. `labelKey`는 번역 키다. */
export const GA_CORE_METRICS = [
	{ key: "active_users", labelKey: "admin.gaMetrics.metrics.active_users" },
	{
		key: "side_panel_open",
		labelKey: "admin.gaMetrics.metrics.side_panel_open",
	},
	{ key: "memo_write", labelKey: "admin.gaMetrics.metrics.memo_write" },
	{ key: "memo_open", labelKey: "admin.gaMetrics.metrics.memo_open" },
	{ key: "memo_search", labelKey: "admin.gaMetrics.metrics.memo_search" },
	{
		key: "summary_complete",
		labelKey: "admin.gaMetrics.metrics.summary_complete",
	},
	{ key: "summary_fail", labelKey: "admin.gaMetrics.metrics.summary_fail" },
	{
		key: "chat_message_send",
		labelKey: "admin.gaMetrics.metrics.chat_message_send",
	},
	{ key: "login", labelKey: "admin.gaMetrics.metrics.login" },
	{ key: "sign_up", labelKey: "admin.gaMetrics.metrics.sign_up" },
	{
		key: "extension_installed",
		labelKey: "admin.gaMetrics.metrics.extension_installed",
	},
	{ key: "first_visit", labelKey: "admin.gaMetrics.metrics.first_visit" },
] as const;

/** 활성 사용자는 사람 수만 있고 건수가 없다. 이 지표를 가리키는 키다. */
export const GA_ACTIVE_USERS_METRIC = "active_users";

/** 자동저장마다 발생해 건수로 보면 부풀려지는 이벤트. */
export const GA_INFLATED_EVENTS: readonly string[] = [
	"memo_write",
	"memo_content_saved",
	"memo_save_result",
	"memo_editor_ready",
];

/** 기간 선택지(일). 90일치를 한 번 받아 클라이언트에서 자른다. */
export const GA_PERIOD_OPTIONS = [7, 30, 90] as const;

/** 한 번에 받아 오는 일수. 기간 선택지의 최댓값과 같다. */
export const GA_FETCH_DAYS = 90;

/** 기준일 직전 며칠의 평균을 비교 대상으로 삼는지. */
export const GA_AVERAGE_WINDOW_DAYS = 7;
