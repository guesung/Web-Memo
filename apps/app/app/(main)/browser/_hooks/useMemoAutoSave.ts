import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
	configureMemoAutoSaveSession,
	editMemoAutoSaveSession,
	flushMemoAutoSaveSession,
	hydrateMemoAutoSaveSession,
	type MemoAutoSaveResult,
	type MemoAutoSaveSnapshot,
	openMemoAutoSaveSession,
	retryMemoAutoSaveCleanup,
	subscribeMemoAutoSaveSession,
} from "@/lib/memoAutoSaveSession";
import type { IFMemoPanelDraft } from "@/lib/memoDraft";

/** 화면 수명과 독립된 session에 입력을 즉시 남기고 현재 화면에만 결과를 연결한다. */
export function useMemoAutoSave(options: MemoAutoSaveOptions) {
	const [, render] = useState(0);
	const current = useRef(options);
	current.current = options;
	const session = openMemoAutoSaveSession(options);
	const bound = useRef(session);
	bound.current = session;
	hydrateMemoAutoSaveSession(session, options.draft);
	configureMemoAutoSaveSession(session, {
		canSave:
			options.canSave &&
			(!session.draft.pendingLocalId ||
				session.draft.pendingSaveMode === "separate" ||
				(session.draft.pendingSaveMode === "existing" &&
					typeof session.draft.pendingTargetId === "number")),
		save: options.save,
		...(session.draft.pendingLocalId
			? {
					targetId:
						session.draft.pendingSaveMode === "existing"
							? (session.draft.pendingTargetId ?? null)
							: null,
				}
			: {}),
	});

	useEffect(() => {
		const unsubscribe = subscribeMemoAutoSaveSession(session, () => {
			if (bound.current !== session || !session.active) return;
			render((value) => value + 1);
			if (session.targetId !== null && session.savedRevision > 0) {
				current.current.onSavedId(session.targetId);
			}
		});
		const subscription = AppState.addEventListener("change", (state) => {
			if (state !== "active") void flushMemoAutoSaveSession(session);
		});
		return () => {
			unsubscribe();
			subscription.remove();
			void flushMemoAutoSaveSession(session);
		};
	}, [session]);

	return {
		draft: session.draft,
		targetId: session.targetId,
		failure: session.failure,
		isPending: session.isSaving || session.isCleaning,
		handleEdit: (patch: Partial<IFMemoPanelDraft>) =>
			editMemoAutoSaveSession(session, patch),
		handleFlush: () => {
			void flushMemoAutoSaveSession(session);
		},
		handleRetry: () => {
			if (session.failure === "cleanup") void retryMemoAutoSaveCleanup(session);
			else void flushMemoAutoSaveSession(session, true);
		},
	};
}

interface MemoAutoSaveOptions {
	owner: string;
	tabId: string;
	pageKey: string;
	url: string;
	selectionId: number | string | null;
	targetId: number | string | null;
	draft: IFMemoPanelDraft;
	canSave: boolean;
	save: (snapshot: MemoAutoSaveSnapshot) => Promise<MemoAutoSaveResult>;
	onSavedId: (id: number | string) => void;
}
