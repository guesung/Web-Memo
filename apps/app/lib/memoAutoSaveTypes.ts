import type { IFMemoPanelDraft } from "./memoDraft";

export interface MemoAutoSaveSnapshot {
	owner: string;
	url: string;
	targetId: number | string | null;
	draft: IFMemoPanelDraft;
	titleEdited: boolean;
	revision: number;
}

export interface MemoAutoSaveResult {
	id: number | string;
	cleanup?: () => Promise<void>;
}

export interface MemoAutoSaveSession {
	key: string;
	owner: string;
	tabId: string;
	pageKey: string;
	url: string;
	targetId: number | string | null;
	draft: IFMemoPanelDraft;
	titleEdited: boolean;
	revision: number;
	savedRevision: number;
	active: boolean;
	canSave: boolean;
	isSaving: boolean;
	isCleaning: boolean;
	failure: "save" | "cleanup" | null;
	timer: ReturnType<typeof setTimeout> | null;
	inFlight: Promise<void> | null;
	cleanup: (() => Promise<void>) | null;
	save:
		| ((snapshot: MemoAutoSaveSnapshot) => Promise<MemoAutoSaveResult>)
		| null;
	listeners: Set<() => void>;
}
