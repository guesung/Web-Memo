import type { MemoInput } from "@src/types/Input";
import {
	useDebounce,
	useDidMount,
	useMemoQuery,
	useMemoUpsertMutation,
	useTabQuery,
} from "@web-memo/shared/hooks";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { getTabInfo } from "@web-memo/shared/utils/extension";
import { useCallback, useEffect, useState } from "react";
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
	const { mutate: upsertMemo } = useMemoUpsertMutation();
	const [isSaving, setIsSaving] = useState(false);

	useDidMount(() => {
		ExtensionBridge.responseRefetchTheMemosFromWeb(refetchMemo);
		ExtensionBridge.responseRefetchTheMemosFromExtension(refetchMemo);
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

			const tabInfo = await getTabInfo();

			upsertMemo(
				{
					id: memoData?.id,
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
				},
			);
		},
		[getValues, memoData?.id, upsertMemo, onSaveSuccess],
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
