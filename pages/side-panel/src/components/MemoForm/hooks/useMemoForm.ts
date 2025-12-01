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
import type { MemoTable } from "@web-memo/shared/types";
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

	useDidMount(() => {
		ExtensionBridge.responseRefetchTheMemos(refetchMemo);
	});

	useEffect(
		function initMemoData() {
			setValue("memo", memoData?.memo ?? "");
			setValue("isWish", memoData?.isWish ?? false);
			setValue("categoryId", memoData?.category_id ?? null);
		},
		[memoData?.memo, memoData?.isWish, memoData?.category_id, setValue],
	);

	const saveMemo = async (memoInfo: MemoTable["Insert"]) => {
		setIsSaving(true);

		if (isCreatingRef.current) return;

		if (memoData) {
			mutateMemoPatch(
				{ id: memoData.id, request: memoInfo },
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

			mutateMemoPost(memoInfo, {
				onSuccess: () => {
					setTimeout(() => {
						setIsSaving(false);
					}, 500);
					isCreatingRef.current = false;
				},
			});
		}
	};

	const handleMemoChange = (text: string, ...props: any) => {
		console.log(text, props);
		isEditingRef.current = true;
		setValue("memo", text);

		debounce(async () => {
			const tabInfo = await getTabInfo();

			console.log(tabInfo);

			const memoInfo = {
				...tabInfo,
				memo: text,
				isWish: watch("isWish"),
				category_id: watch("categoryId"),
			};

			await saveMemo(memoInfo);
			isEditingRef.current = false;
		}, 1000);
	};

	return {
		memoData,
		isSaving,
		saveMemo,
		handleMemoChange,
	};
}
