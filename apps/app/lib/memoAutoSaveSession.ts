import {
	attachMemoAutoSaveId,
	memoAutoSaveSessions,
} from "./memoAutoSaveRegistry";

export {
	discardMemoAutoSaveSession,
	hydrateMemoAutoSaveSession,
	openMemoAutoSaveSession,
	setMemoAutoSaveOwner,
	subscribeMemoAutoSaveSession,
} from "./memoAutoSaveRegistry";

import type {
	MemoAutoSaveResult,
	MemoAutoSaveSession,
	MemoAutoSaveSnapshot,
} from "./memoAutoSaveTypes";
import type { IFMemoPanelDraft } from "./memoDraft";
import { serialMemoWrite } from "./serialMemoWrites";

export type { MemoAutoSaveSession, MemoAutoSaveSnapshot, MemoAutoSaveResult };

export const MEMO_AUTO_SAVE_DELAY = 1000;

export function configureMemoAutoSaveSession(
	session: MemoAutoSaveSession,
	options: {
		canSave: boolean;
		targetId?: number | string | null;
		save: (snapshot: MemoAutoSaveSnapshot) => Promise<MemoAutoSaveResult>;
	},
) {
	const wasBlocked = !session.canSave;
	if (
		options.targetId !== undefined &&
		!session.isSaving &&
		!session.savedRevision
	)
		session.targetId = options.targetId;
	session.canSave = options.canSave;
	session.save = options.save;
	if (
		wasBlocked &&
		options.canSave &&
		isMemoAutoSaveDirty(session) &&
		!session.failure
	) {
		schedule(session);
	}
}

export function editMemoAutoSaveSession(
	session: MemoAutoSaveSession,
	patch: Partial<IFMemoPanelDraft>,
) {
	if (!session.active) return;
	session.draft = { ...session.draft, ...patch };
	if (patch.title !== undefined) session.titleEdited = true;
	session.revision += 1;
	schedule(session);
	notify(session);
}

export function isMemoAutoSaveDirty(session: MemoAutoSaveSession) {
	return session.revision > session.savedRevision;
}

/** 닫기·전환·background도 같은 고정 snapshot 경로를 쓴다. */
export function flushMemoAutoSaveSession(
	session: MemoAutoSaveSession,
	retry = false,
): Promise<void> {
	cancelTimer(session);
	if (session.inFlight) return session.inFlight;
	if (!canWrite(session) || (session.failure === "save" && !retry))
		return Promise.resolve();
	const operation = drain(session);
	session.inFlight = operation;
	void operation.finally(() => {
		session.inFlight = null;
		session.isSaving = false;
		notify(session);
	});
	return operation;
}

export function flushMemoAutoSaveSessions() {
	for (const session of memoAutoSaveSessions()) {
		if (session.active) void flushMemoAutoSaveSession(session);
	}
}

export async function retryMemoAutoSaveCleanup(session: MemoAutoSaveSession) {
	if (!session.active || !session.cleanup || session.isCleaning) return;
	session.isCleaning = true;
	notify(session);
	try {
		await session.cleanup();
		session.cleanup = null;
		session.failure = null;
	} catch {
		session.failure = "cleanup";
	} finally {
		session.isCleaning = false;
		notify(session);
	}
}

async function drain(session: MemoAutoSaveSession) {
	session.isSaving = true;
	notify(session);
	while (canWrite(session)) {
		const snapshot: MemoAutoSaveSnapshot = {
			owner: session.owner,
			url: session.url,
			targetId: session.targetId,
			draft: { ...session.draft },
			titleEdited: session.titleEdited,
			revision: session.revision,
		};
		const save = session.save;
		if (!save) return;
		const key = JSON.stringify([
			session.owner,
			snapshot.targetId === null ? "new" : typeof snapshot.targetId,
			snapshot.targetId ?? session.pageKey,
		]);
		try {
			const result = await serialMemoWrite(key, () => {
				if (!session.active) throw new Error("편집 계정이 변경됐습니다.");
				return save(snapshot);
			});
			session.targetId = result.id;
			session.savedRevision = snapshot.revision;
			session.failure = session.cleanup ? "cleanup" : null;
			attachMemoAutoSaveId(session, result.id);
			// 원격 ID를 먼저 확정해야 원본 정리 실패가 신규 생성으로 되돌아가지 않는다.
			if (result.cleanup) {
				session.cleanup = result.cleanup;
				session.draft = {
					...session.draft,
					pendingLocalId: null,
					pendingSaveMode: null,
				};
				await retryMemoAutoSaveCleanup(session);
			}
			notify(session);
		} catch {
			session.failure = "save";
			notify(session);
			return;
		}
	}
}

function canWrite(session: MemoAutoSaveSession) {
	if (
		!session.active ||
		!session.canSave ||
		!session.save ||
		!isMemoAutoSaveDirty(session)
	)
		return false;
	if (session.targetId !== null) return true;
	const { title, memo, impression, actionItem } = session.draft;
	return Boolean(
		(session.titleEdited && title.trim()) ||
			memo.trim() ||
			impression.trim() ||
			actionItem.trim(),
	);
}

function schedule(session: MemoAutoSaveSession) {
	cancelTimer(session);
	if (!session.active || !session.canSave) return;
	session.timer = setTimeout(() => {
		session.timer = null;
		void flushMemoAutoSaveSession(session, true);
	}, MEMO_AUTO_SAVE_DELAY);
}

function cancelTimer(session: MemoAutoSaveSession) {
	if (session.timer) clearTimeout(session.timer);
	session.timer = null;
}

function notify(session: MemoAutoSaveSession) {
	for (const listener of session.listeners) listener();
}
