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

export default function useMemoForm() {
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
	const isEditingRef = useRef(false);
	const initializedRef = useRef(false);

	useDidMount(() => {
		ExtensionBridge.responseRefetchTheMemos(refetchMemo);
	});

	useEffect(
		function initMemoData() {
			// 편집 중이거나 이미 초기화된 경우 memo 값은 덮어쓰지 않음
			if (!isEditingRef.current && !initializedRef.current) {
				setValue("memo", memoData?.memo ?? "");
				if (memoData?.memo !== undefined) {
					initializedRef.current = true;
				}
			}
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
				},
			});
		}
	};

	const handleMemoChange = (text: string) => {
		isEditingRef.current = true;
		setValue("memo", text);
		debounce(() => {
			saveMemo({
				memo: text,
				isWish: watch("isWish"),
				categoryId: watch("categoryId"),
			});
			isEditingRef.current = false;
		});
	};

	return {
		memoData,
		isSaving,
		saveMemo,
		handleMemoChange,
	};
}
