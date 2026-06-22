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
	const { debounce } = useDebounce();
	const { data: tab } = useTabQuery();
	const { memo: memoData, refetch: refetchMemo } = useMemoQuery({
		url: tab?.url ?? "",
	});
	const { mutate: upsertMemo } = useMemoUpsertMutation();
	const { mutate: patchMemo } = useMemoPatchMutation();
	const [isSaving, setIsSaving] = useState(false);
	const initializedMemoIdRef = useRef<number | null>(null);
	const pendingDataRef = useRef<SaveMemoOptions | null>(null);

	useDidMount(() => {
		bridge.handle.REFETCH_THE_MEMO_LIST_FROM_WEB(refetchMemo);
		bridge.handle.REFETCH_THE_MEMO_LIST_FROM_EXTENSION(refetchMemo);
	});

	useEffect(
		function initMemoData() {
			const currentMemoId = memoData?.id ?? null;
			const isNewMemo = initializedMemoIdRef.current !== currentMemoId;

			if (isNewMemo) {
				setValue("memo", memoData?.memo ?? "");
				setValue("impression", memoData?.impression ?? "");
				setValue("actionItem", memoData?.actionItem ?? "");
				initializedMemoIdRef.current = currentMemoId;
			}

			setValue("isWish", memoData?.isWish ?? false);
			setValue("isStar", memoData?.isStar ?? false);
			setValue("categoryId", memoData?.category_id ?? null);
		},
		[
			memoData?.id,
			memoData?.memo,
			memoData?.impression,
			memoData?.actionItem,
			memoData?.isWish,
			memoData?.isStar,
			memoData?.category_id,
			setValue,
		],
	);

	const saveMemo = useCallback(
		async (overrides?: SaveMemoOptions) => {
			if (isSaving) {
				pendingDataRef.current = overrides ?? null;
				return;
			}

			const currentValues = getValues();
			const memoInput: MemoInput = {
				memo: overrides?.memo ?? currentValues.memo,
				impression: overrides?.impression ?? currentValues.impression,
				actionItem: overrides?.actionItem ?? currentValues.actionItem,
				isWish: overrides?.isWish ?? currentValues.isWish,
				isStar: overrides?.isStar ?? currentValues.isStar,
				categoryId: overrides?.categoryId ?? currentValues.categoryId,
			};

			setIsSaving(true);
			pendingDataRef.current = null;

			const tabInfo = overrides?.tabInfo ?? (await getTabInfo());
			const memoId = overrides?.memoId ?? memoData?.id;

			upsertMemo(
				{
					id: memoId,
					url: tabInfo.url,
					data: {
						...tabInfo,
						memo: memoInput.memo,
						impression: memoInput.impression,
						actionItem: memoInput.actionItem,
						isWish: memoInput.isWish,
						isStar: memoInput.isStar,
						category_id: memoInput.categoryId,
					},
				},
				{
					onSuccess: () => {
						setTimeout(() => {
							setIsSaving(false);
							if (pendingDataRef.current !== null) {
								const pendingData = pendingDataRef.current;
								pendingDataRef.current = null;
								saveMemo(pendingData);
							}
						}, 500);
						onSaveSuccess?.(memoInput);
					},
					onError: () => {
						setIsSaving(false);
						pendingDataRef.current = null;
					},
				},
			);
		},
		[isSaving, getValues, memoData?.id, upsertMemo, onSaveSuccess],
	);

	const handleMemoChange = useCallback(
		(text: string) => {
			setValue("memo", text);
			debounce(() => saveMemo({ memo: text }));
		},
		[setValue, debounce, saveMemo],
	);

	const handleImpressionChange = useCallback(
		(text: string) => {
			setValue("impression", text);
			debounce(() => saveMemo({ impression: text }));
		},
		[setValue, debounce, saveMemo],
	);

	const handleActionItemChange = useCallback(
		(text: string) => {
			setValue("actionItem", text);
			debounce(() => saveMemo({ actionItem: text }));
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
		await saveMemo({ isWish: newIsWish });
		return newIsWish;
	}, [getValues, setValue, saveMemo]);

	const toggleStar = useCallback(async () => {
		const currentIsStar = getValues("isStar");
		const newIsStar = !currentIsStar;
		setValue("isStar", newIsStar);
		await saveMemo({ isStar: newIsStar });
		return newIsStar;
	}, [getValues, setValue, saveMemo]);

	return {
		memoData,
		isSaving,
		saveMemo,
		handleMemoChange,
		handleImpressionChange,
		handleActionItemChange,
		updateCategory,
		toggleWish,
		toggleStar,
	};
}
