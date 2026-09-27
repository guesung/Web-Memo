import { createBridge, defineMessage } from "./createBridge";
import type {
	CreateMemoPayload,
	CreateMemoResponse,
	GetHighlightsByUrlPayload,
	GetHighlightsByUrlResponse,
	IFCreateHighlightPayload,
	IFEditHighlightPayload,
	IFGetLoginStatusResponse,
	IFSettingUpdatedPayload,
	PageContentResponse,
	TCreateHighlightResponse,
	TEditHighlightResponse,
} from "./types";

/** 확장 UI와 background 사이의 타입 지정 메시지 계약. */
export const bridge = createBridge({
	GET_SIDE_PANEL_OPEN: defineMessage<void, boolean>("toExtension"),
	OPEN_SIDE_PANEL: defineMessage<void, void>("internal", {
		notification: true,
	}),
	GET_TABS: defineMessage<void, chrome.tabs.Tab>("internal"),
	PAGE_CONTENT: defineMessage<void, PageContentResponse>("toTab"),
	YOUTUBE_TRANSCRIPT: defineMessage<void, string>("toTab", {
		timeoutMs: 75_000,
	}),
	REFETCH_THE_MEMO_LIST_FROM_EXTENSION: defineMessage<void, void>("internal", {
		notification: true,
	}),
	REFETCH_THE_MEMO_LIST_FROM_WEB: defineMessage<void, void>("toExtension", {
		notification: true,
	}),
	UPDATE_SIDE_PANEL: defineMessage<void, void>("internal", {
		notification: true,
	}),
	SETTING_UPDATED: defineMessage<IFSettingUpdatedPayload, void>("internal", {
		notification: true,
	}),
	GET_EXTENSION_MANIFEST: defineMessage<void, chrome.runtime.Manifest>(
		"toExtension",
	),
	SYNC_LOGIN_STATUS: defineMessage<void, void>("toExtension", {
		notification: true,
	}),
	CREATE_HIGHLIGHT: defineMessage<
		IFCreateHighlightPayload,
		TCreateHighlightResponse
	>("internal", { timeoutMs: 30_000 }),
	EDIT_HIGHLIGHT: defineMessage<IFEditHighlightPayload, TEditHighlightResponse>(
		"internal",
		{ timeoutMs: 30_000 },
	),
	CREATE_MEMO: defineMessage<CreateMemoPayload, CreateMemoResponse>(
		"internal",
		{ timeoutMs: 30_000 },
	),
	GET_HIGHLIGHTS_BY_URL: defineMessage<
		GetHighlightsByUrlPayload,
		GetHighlightsByUrlResponse
	>("internal", { timeoutMs: 30_000 }),
	GET_LOGIN_STATUS: defineMessage<void, IFGetLoginStatusResponse>("internal"),
});

/** 확장 내부 메시지 API 타입. */
export type Bridge = typeof bridge;
