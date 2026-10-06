import type { MemoInput } from "@src/app/[lng]/(auth)/(sidebar)/memos/_types/Input";
import {
	useDebounce,
	useKeyboardBind,
	useMemoPatchMutation,
} from "@web-memo/shared/hooks";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { TMemoSaveStatus } from "./SaveStatusIndicator";

const FIELDS = ["title", "memo", "impression", "actionItem"] as const;

/** 폼과 서버 응답을 필드 단위로 동기화하며 사용자 입력만 저장한다. */
export function useMemoDialogEditor({ memo, latestMemo }: EditorArgs) {
	const form = useForm<MemoInput>({ defaultValues: toInput(memo) });
	const { getValues, setValue } = form;
	const { mutateAsync: mutateMemoPatch } = useMemoPatchMutation();
	const { debounce, flushDebounce, abortDebounce } = useDebounce();
	const [saveStatus, setSaveStatus] = useState<TMemoSaveStatus>("idle");
	const baseline = useRef<MemoInput>(toInput(memo));
	const dirty = useRef(new Set<MemoField>());
	const committed = useRef<Partial<MemoInput>>({});
	const isSaving = useRef(false);
	const hasPendingBodyEdit = useRef(false);
	useEffect(() => abortDebounce, [abortDebounce]);

	useEffect(() => {
		if (!latestMemo || latestMemo.id !== memo.id) return;
		const incoming = toInput(latestMemo);
		for (const field of FIELDS) {
			if (dirty.current.has(field)) continue;
			if (committed.current[field] !== undefined) {
				if (committed.current[field] !== incoming[field]) continue;
				delete committed.current[field];
			}
			baseline.current[field] = incoming[field];
			if (getValues(field) !== incoming[field]) {
				setValue(field, incoming[field]);
			}
		}
	}, [latestMemo, memo.id, getValues, setValue]);

	function saveMemo() {
		if (isSaving.current) return;
		const values = getValues();
		const request: Partial<MemoInput> = {};
		for (const field of FIELDS) {
			if (!dirty.current.has(field)) continue;
			if (values[field] === baseline.current[field]) {
				dirty.current.delete(field);
				continue;
			}
			request[field] = values[field];
		}
		if (Object.keys(request).length === 0) {
			if (dirty.current.size === 0 && hasPendingBodyEdit.current) {
				hasPendingBodyEdit.current = false;
				setSaveStatus("idle");
			}
			return;
		}
		const showStatus = hasPendingBodyEdit.current;
		isSaving.current = true;
		if (showStatus) setSaveStatus("saving");
		void persistMemo();

		async function persistMemo() {
			try {
				await mutateMemoPatch({ id: memo.id, request });
				for (const field of FIELDS) {
					const sent = request[field];
					if (sent === undefined) continue;
					baseline.current[field] = sent;
					committed.current[field] = sent;
					if (getValues(field) === sent) dirty.current.delete(field);
				}
				isSaving.current = false;
				if (dirty.current.size > 0) {
					saveMemo();
					return;
				}
				hasPendingBodyEdit.current = false;
				if (showStatus) setSaveStatus("saved");
			} catch {
				isSaving.current = false;
				if (showStatus) setSaveStatus("error");
			}
		}
	}

	function markEdited(field: MemoField) {
		dirty.current.add(field);
		if (field !== "title") {
			hasPendingBodyEdit.current = true;
			setSaveStatus("saving");
		}
		debounce(saveMemo, 1_000);
	}

	function changeTitle(title: string) {
		setValue("title", title, { shouldDirty: true });
		markEdited("title");
	}

	useKeyboardBind({ key: "s", callback: saveMemo, isMetaKey: true });

	return { form, saveStatus, markEdited, changeTitle, flushDebounce };
}

function toInput(memo: GetMemoResponse): MemoInput {
	return {
		title: memo.title,
		memo: memo.memo,
		impression: memo.impression ?? "",
		actionItem: memo.actionItem ?? "",
	};
}

type MemoField = (typeof FIELDS)[number];
interface EditorArgs {
	memo: GetMemoResponse;
	latestMemo?: GetMemoResponse;
}
