import type { MemoInput } from "@src/types/Input";
import {
	useDebounce,
	useDidMount,
	useMemoPatchMutation,
	useMemoPostMutation,
	useMemoQuery,
	useTabQuery,
} from "@web-memo/shared/hooks";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { getTabInfo } from "@web-memo/shared/utils/extension";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";

interface UseMemoFormProps {
	onSaveSuccess?: (memoInput: MemoInput) => void;
}

interface TabInfo {
	title: string;
	favIconUrl: string | undefined;
	url: string;
}

export default function useMemoForm({ onSaveSuccess }: UseMemoFormProps = {}) {
	const { setValue, getValues } = useFormContext<MemoInput>();
	const { debounce } = useDebounce();
	const { data: tab } = useTabQuery();
	const { memo: memoData, refetch: refetchMemo } = useMemoQuery({
		url: tab.url,
	});
	const { mutate: mutateMemoPatch } = useMemoPatchMutation();
	const { mutate: mutateMemoPost } = useMemoPostMutation();
	const [isSaving, setIsSaving] = useState(false);
	const isCreatingRef = useRef(false);
	const initialTabInfoRef = useRef<TabInfo | null>(null);

	useDidMount(() => {
		ExtensionBridge.responseRefetchTheMemosFromWeb(refetchMemo);
		ExtensionBridge.responseRefetchTheMemosFromExtension(refetchMemo);

		getTabInfo().then((tabInfo) => {
			initialTabInfoRef.current = tabInfo;
		});
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
		async (overrides?: Partial<MemoInput>) => {
			const currentValues = getValues();
			const memoInput: MemoInput = {
				memo: overrides?.memo ?? currentValues.memo,
				isWish: overrides?.isWish ?? currentValues.isWish,
				categoryId: overrides?.categoryId ?? currentValues.categoryId,
			};

			setIsSaving(true);

			const tabInfo = initialTabInfoRef.current ?? (await getTabInfo());

			const totalMemo = {
				...tabInfo,
				memo: memoInput.memo,
				isWish: memoInput.isWish,
				category_id: memoInput.categoryId,
			};

			if (isCreatingRef.current) return;

			if (memoData) {
				mutateMemoPatch(
					{ id: memoData.id, request: totalMemo },
					{
						onSuccess: () => {
							setTimeout(() => {
								setIsSaving(false);
							}, 500);
							onSaveSuccess?.(memoInput);
						},
					},
				);
				return;
			}

			isCreatingRef.current = true;

			mutateMemoPost(totalMemo, {
				onSuccess: () => {
					setTimeout(() => {
						setIsSaving(false);
					}, 500);
					isCreatingRef.current = false;
					onSaveSuccess?.(memoInput);
				},
			});
		},
		[getValues, memoData, mutateMemoPatch, mutateMemoPost, onSaveSuccess],
	);

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
			saveMemo({ categoryId });
		},
		[setValue, saveMemo],
	);

	const toggleWish = useCallback(async () => {
		const currentIsWish = getValues("isWish");
		const newIsWish = !currentIsWish;
		setValue("isWish", newIsWish);
		await saveMemo({ isWish: newIsWish });
		return newIsWish;
	}, [getValues, setValue, saveMemo]);

	return {
		memoData,
		isSaving,
		saveMemo,
		handleMemoChange,
		updateCategory,
		toggleWish,
	};
}
