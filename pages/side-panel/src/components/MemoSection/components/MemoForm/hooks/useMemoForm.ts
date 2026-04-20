import type { MemoInput } from "@src/types/Input";
import {
	useDebounce,
	useDidMount,
	useMemoPatchMutation,
	useMemoQuery,
	useMemoUpsertMutation,
	useTabQuery,
} from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { getTabInfo } from "@web-memo/shared/utils/extension";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";

interface SaveMemoOptions extends Partial<MemoInput> {
	tabInfo?: { title: string; favIconUrl?: string; url: string };
	memoId?: number;
}

interface UseMemoFormProps {
	onSaveSuccess?: (memoInput: MemoInput) => void;
}

export default function useMemoForm({ onSaveSuccess }: UseMemoFormProps = {}) {
	const { setValue, getValues } = useFormContext<MemoInput>();
	const { debounce, abortDebounce } = useDebounce();
	const { data: tab } = useTabQuery();
	const { memo: memoData, refetch: refetchMemo } = useMemoQuery({
		url: tab?.url ?? "",
	});
	const { mutate: upsertMemo } = useMemoUpsertMutation();
	const { mutate: patchMemo } = useMemoPatchMutation();
	const [isSaving, setIsSaving] = useState(false);
	const savingRef = useRef(false);
	const hasPendingRef = useRef(false);
	const pendingOverridesRef = useRef<SaveMemoOptions | undefined>(undefined);
	const saveMemoRef = useRef<
		((overrides?: SaveMemoOptions) => Promise<void>) | null
	>(null);

	useDidMount(() => {
		bridge.handle.REFETCH_THE_MEMO_LIST_FROM_WEB(refetchMemo);
		bridge.handle.REFETCH_THE_MEMO_LIST_FROM_EXTENSION(refetchMemo);
	});

	useEffect(
		function initMemoData() {
			setValue("memo", memoData?.memo ?? "");
			setValue("isWish", memoData?.isWish ?? false);
			setValue("categoryId", memoData?.category_id ?? null);
		},
		[memoData?.memo, memoData?.isWish, memoData?.category_id, setValue],
	);

	const saveMemo = useCallback(
		async (overrides?: SaveMemoOptions) => {
			if (savingRef.current) {
				hasPendingRef.current = true;
				pendingOverridesRef.current = overrides;
				return;
			}
			savingRef.current = true;

			const currentValues = getValues();
			const memoInput: MemoInput = {
				memo: overrides?.memo ?? currentValues.memo,
				isWish: overrides?.isWish ?? currentValues.isWish,
				categoryId: overrides?.categoryId ?? currentValues.categoryId,
			};

			setIsSaving(true);

			const tabInfo = overrides?.tabInfo ?? (await getTabInfo());
			const memoId = overrides?.memoId ?? memoData?.id;

			upsertMemo(
				{
					id: memoId,
					url: tabInfo.url,
					data: {
						...tabInfo,
						memo: memoInput.memo,
						isWish: memoInput.isWish,
						category_id: memoInput.categoryId,
					},
				},
				{
					onSuccess: () => {
						setTimeout(() => {
							setIsSaving(false);
						}, 500);
						onSaveSuccess?.(memoInput);
					},
					onError: () => {
						setIsSaving(false);
					},
					onSettled: () => {
						savingRef.current = false;
						if (hasPendingRef.current) {
							hasPendingRef.current = false;
							const pending = pendingOverridesRef.current;
							pendingOverridesRef.current = undefined;
							saveMemoRef.current?.(pending);
						}
					},
				},
			);
		},
		[getValues, memoData?.id, upsertMemo, onSaveSuccess],
	);

	saveMemoRef.current = saveMemo;

	const handleMemoChange = useCallback(
		(text: string) => {
			setValue("memo", text);
			debounce(() => saveMemo({ memo: text }));
		},
		[setValue, debounce, saveMemo],
	);

	const updateCategory = useCallback(
		(categoryId: number | null) => {
			setValue("categoryId", categoryId);
			if (memoData?.id) {
				patchMemo({ id: memoData.id, request: { category_id: categoryId } });
			}
		},
		[setValue, memoData?.id, patchMemo],
	);

	const toggleWish = useCallback(async () => {
		const currentIsWish = getValues("isWish");
		const newIsWish = !currentIsWish;
		setValue("isWish", newIsWish);
		abortDebounce();
		await saveMemo({ isWish: newIsWish });
		return newIsWish;
	}, [getValues, setValue, abortDebounce, saveMemo]);

	return {
		memoData,
		isSaving,
		saveMemo,
		handleMemoChange,
		updateCategory,
		toggleWish,
	};
}
