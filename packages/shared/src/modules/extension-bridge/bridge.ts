import { createBridge, defineMessage } from "./createBridge";
import type {
	CreateMemoPayload,
	CreateMemoResponse,
	GetHighlightsByUrlPayload,
	GetHighlightsByUrlResponse,
	IFCreateHighlightPayload,
	IFEditHighlightPayload,
	PageContentResponse,
	TCreateHighlightResponse,
	TEditHighlightResponse,
} from "./types";

/** 확장 UI와 background 사이의 타입 지정 메시지 계약. */
export const bridge = createBridge({
	GET_SIDE_PANEL_OPEN: defineMessage<void, boolean>("toExtension"),
	OPEN_SIDE_PANEL: defineMessage<void, void>("internal"),
	GET_TABS: defineMessage<void, chrome.tabs.Tab>("internal"),
	PAGE_CONTENT: defineMessage<void, PageContentResponse>("toTab"),
	YOUTUBE_TRANSCRIPT: defineMessage<void, string>("toTab"),
	REFETCH_THE_MEMO_LIST_FROM_EXTENSION: defineMessage<void, void>("internal"),
	REFETCH_THE_MEMO_LIST_FROM_WEB: defineMessage<void, void>("toExtension"),
	UPDATE_SIDE_PANEL: defineMessage<void, void>("internal"),
	GET_EXTENSION_MANIFEST: defineMessage<void, chrome.runtime.Manifest>(
		"toExtension",
	),
	SYNC_LOGIN_STATUS: defineMessage<void, void>("toExtension"),
	CREATE_HIGHLIGHT: defineMessage<
		IFCreateHighlightPayload,
		TCreateHighlightResponse
	>("internal"),
	EDIT_HIGHLIGHT: defineMessage<IFEditHighlightPayload, TEditHighlightResponse>(
		"internal",
	),
	CREATE_MEMO: defineMessage<CreateMemoPayload, CreateMemoResponse>("internal"),
	GET_HIGHLIGHTS_BY_URL: defineMessage<
		GetHighlightsByUrlPayload,
		GetHighlightsByUrlResponse
	>("internal"),
});

export type Bridge = typeof bridge;
