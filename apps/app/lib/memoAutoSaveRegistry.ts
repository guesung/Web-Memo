import type { MemoAutoSaveSession } from "./memoAutoSaveTypes";
import type { IFMemoPanelDraft } from "./memoDraft";

const sessions = new Map<string, MemoAutoSaveSession>();
let activeOwner: string | null = null;

/** 인증이 바뀌면 이전 사용자의 예약과 대기 쓰기를 폐기한다. */
export function setMemoAutoSaveOwner(owner: string) {
	if (activeOwner === owner) return;
	activeOwner = owner;
	for (const session of new Set(sessions.values())) {
		session.active = false;
		if (session.timer) clearTimeout(session.timer);
		session.timer = null;
	}
	sessions.clear();
}

export function openMemoAutoSaveSession(options: {
	owner: string;
	tabId: string;
	pageKey: string;
	url: string;
	selectionId: number | string | null;
	targetId: number | string | null;
	draft: IFMemoPanelDraft;
}): MemoAutoSaveSession {
	const key = sessionKey(options, options.selectionId);
	const existing = sessions.get(key);
	if (existing) return existing;
	const session: MemoAutoSaveSession = {
		key,
		owner: options.owner,
		tabId: options.tabId,
		pageKey: options.pageKey,
		url: options.url,
		targetId: options.targetId,
		draft: { ...options.draft },
		titleEdited: false,
		revision: 0,
		savedRevision: 0,
		active: activeOwner === options.owner,
		canSave: false,
		isSaving: false,
		isCleaning: false,
		failure: null,
		timer: null,
		inFlight: null,
		cleanup: null,
		save: null,
		listeners: new Set(),
	};
	sessions.set(key, session);
	return session;
}

/** 조회로 채운 값은 사용자 편집으로 세지 않는다. */
export function hydrateMemoAutoSaveSession(
	session: MemoAutoSaveSession,
	draft: IFMemoPanelDraft,
) {
	if (session.revision || session.isSaving || session.failure) return;
	session.draft = { ...draft };
}

export function subscribeMemoAutoSaveSession(
	session: MemoAutoSaveSession,
	listener: () => void,
) {
	session.listeners.add(listener);
	return () => {
		session.listeners.delete(listener);
	};
}

export function memoAutoSaveSessions() {
	return new Set(sessions.values());
}
export function attachMemoAutoSaveId(
	session: MemoAutoSaveSession,
	id: number | string,
) {
	if (session.active) sessions.set(sessionKey(session, id), session);
}

/** 사용자가 대상을 확인해 초안을 옮긴 뒤 이전 신규 초안을 비운다. */
export function discardMemoAutoSaveSession(session: MemoAutoSaveSession) {
	if (session.isSaving) return;
	session.active = false;
	if (session.timer) clearTimeout(session.timer);
	session.timer = null;
	for (const [key, value] of sessions) {
		if (value === session) sessions.delete(key);
	}
}

function sessionKey(
	scope: Pick<MemoAutoSaveSession, "owner" | "tabId" | "pageKey">,
	id: number | string | null,
) {
	return JSON.stringify([
		scope.owner,
		scope.tabId,
		scope.pageKey,
		id === null ? "new" : typeof id,
		id,
	]);
}
