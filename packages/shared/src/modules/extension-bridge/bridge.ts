import { createBridge, defineMessage } from "./createBridge";
import type {
	CreateMemoPayload,
	CreateMemoResponse,
	PageContentResponse,
} from "./types";

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
	CREATE_MEMO: defineMessage<CreateMemoPayload, CreateMemoResponse>("internal"),
});

export type Bridge = typeof bridge;
