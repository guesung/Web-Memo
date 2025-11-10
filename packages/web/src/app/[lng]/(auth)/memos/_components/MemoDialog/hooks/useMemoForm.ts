import type { MemoInput } from "@src/app/[lng]/(auth)/memos/_types/Input";
import type { Tables } from "@web-memo/shared/types";
import {
	useDebounce,
	useKeyboardBind,
	useMemoPatchMutation,
} from "@web-memo/shared/hooks";
import { useCallback, useEffect, useImperativeHandle, type RefObject } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

const AUTO_SAVE_DELAY_MS = 1000;

interface UseMemoFormParams {
	memoId: number;
	memoData: Tables<"memo"> | undefined;
	textareaRef: RefObject<HTMLTextAreaElement>;
}

export function useMemoForm({ memoId, memoData, textareaRef }: UseMemoFormParams) {
	const { mutate: mutateMemoPatch } = useMemoPatchMutation();
	const { debounce } = useDebounce();

	const form: UseFormReturn<MemoInput> = useForm<MemoInput>({
		defaultValues: {
			memo: "",
		},
	});

	const { register, watch, setValue } = form;

	const { ref, ...rest } = register("memo", {
		onChange: (event) => {
			event.target.style.height = `${event.target.scrollHeight}px`;
		},
	});
	useImperativeHandle(ref, () => textareaRef.current);

	const saveMemo = useCallback(() => {
		const formValues = watch() as unknown as MemoInput;
		const currentMemo = formValues.memo || "";
		const isEdited = currentMemo !== memoData?.memo;

		if (isEdited && currentMemo.trim() !== "") {
			mutateMemoPatch({
				id: memoId,
				request: {
					memo: currentMemo,
				},
			});
		}
	}, [watch, memoData?.memo, mutateMemoPatch, memoId]);

	const checkIfEdited = useCallback(() => {
		const formValues = watch() as unknown as MemoInput;
		return (formValues.memo || "") !== memoData?.memo;
	}, [watch, memoData?.memo]);

	useKeyboardBind({ key: "s", callback: saveMemo, isMetaKey: true });

	useEffect(() => {
		setValue("memo", memoData?.memo ?? "");
	}, [memoData, setValue]);

	useEffect(() => {
		const subscription = watch((value) => {
			const memoValue = (value as unknown as MemoInput).memo;
			if (memoValue !== undefined) {
				debounce(() => {
					saveMemo();
				}, AUTO_SAVE_DELAY_MS);
			}
		});

		return () => subscription.unsubscribe();
	}, [watch, debounce, saveMemo]);

	return {
		formRegister: rest,
		formRef: ref,
		saveMemo,
		checkIfEdited,
	};
}
