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
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";

interface UseMemoFormProps {
	onSaveSuccess?: (memoInput: MemoInput) => void;
}

export default function useMemoForm({ onSaveSuccess }: UseMemoFormProps = {}) {
	const { setValue, watch } = useFormContext<MemoInput>();
	const { debounce } = useDebounce();
	const { data: tab } = useTabQuery();
	const { memo: memoData, refetch: refetchMemo } = useMemoQuery({
		url: tab.url,
	});
	const { mutate: mutateMemoPatch } = useMemoPatchMutation();
	const { mutate: mutateMemoPost } = useMemoPostMutation();
	const [isSaving, setIsSaving] = useState(false);
	const isCreatingRef = useRef(false);

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

	const saveMemo = async ({ memo, isWish, categoryId }: MemoInput) => {
		setIsSaving(true);

		const tabInfo = await getTabInfo();

		const totalMemo = {
			...tabInfo,
			memo,
			isWish,
			category_id: categoryId,
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
						onSaveSuccess?.({ memo, isWish, categoryId });
					},
				},
			);
			return;
		} else {
			isCreatingRef.current = true;

			mutateMemoPost(totalMemo, {
				onSuccess: () => {
					setTimeout(() => {
						setIsSaving(false);
					}, 500);
					isCreatingRef.current = false;
					onSaveSuccess?.({ memo, isWish, categoryId });
				},
			});
		}
	};

	const handleMemoChange = (text: string) => {
		setValue("memo", text);
		debounce(() =>
			saveMemo({
				memo: text,
				isWish: watch("isWish"),
				categoryId: watch("categoryId"),
			}),
		);
	};

	return {
		memoData,
		isSaving,
		saveMemo,
		handleMemoChange,
	};
}
