import type { MemoInput } from "@src/types/Input";
import type { TMemoStatusKey } from "@web-memo/shared/constants";
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
			setValue("isReading", memoData?.isReading ?? false);
			setValue("categoryId", memoData?.category_id ?? null);
		},
		[
			memoData?.id,
			memoData?.memo,
			memoData?.impression,
			memoData?.actionItem,
			memoData?.isWish,
			memoData?.isStar,
			memoData?.isReading,
			memoData?.category_id,
			setValue,
		],
	);

	const saveMemo = useCallback(
		async (overrides?: SaveMemoOptions) => {
			// 이미 저장 중이면 이 변경은 큐에 실려 다음 저장에 함께 나간다. 그 저장의 성패는
			// 이 호출이 아니라 그때의 onError가 들고 있으므로 여기서는 실패로 보지 않는다.
			if (isSaving) {
				pendingDataRef.current = overrides ?? null;
				return true;
			}

			const currentValues = getValues();
			const memoInput: MemoInput = {
				memo: overrides?.memo ?? currentValues.memo,
				impression: overrides?.impression ?? currentValues.impression,
				actionItem: overrides?.actionItem ?? currentValues.actionItem,
				isWish: overrides?.isWish ?? currentValues.isWish,
				isStar: overrides?.isStar ?? currentValues.isStar,
				isReading: overrides?.isReading ?? currentValues.isReading,
				categoryId: overrides?.categoryId ?? currentValues.categoryId,
			};

			setIsSaving(true);
			pendingDataRef.current = null;

			const tabInfo = overrides?.tabInfo ?? (await getTabInfo());
			const memoId = overrides?.memoId ?? memoData?.id;

			return new Promise<boolean>((resolveIsSaved) => {
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
							isReading: memoInput.isReading,
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
							resolveIsSaved(true);
						},
						onError: () => {
							// 실패 토스트와 Sentry 보고는 QueryProvider의 MutationCache가 이미 맡는다.
							// 여기서는 저장 상태만 되돌리고, 성패는 호출부가 UI 분기에 쓰도록 넘긴다.
							setIsSaving(false);
							pendingDataRef.current = null;
							resolveIsSaved(false);
						},
					},
				);
			});
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

	/**
	 * 메모 상태 하나를 반전시켜 저장한다.
	 * @description 저장에 실패하면 낙관적으로 바꿔둔 폼 값을 되돌리고 `null`을 준다.
	 * 호출부는 이 `null`로 성공 토스트를 건너뛴다. 실패 알림 자체는 QueryProvider의 MutationCache가 맡는다.
	 */
	const toggleMemoStatus = async (statusKey: TMemoStatusKey) => {
		const previousStatusValue = getValues(statusKey);
		const nextStatusValue = !previousStatusValue;
		const statusOverride: Partial<MemoInput> = {};
		statusOverride[statusKey] = nextStatusValue;

		setValue(statusKey, nextStatusValue);

		const isSaved = await saveMemo(statusOverride);

		if (!isSaved) {
			setValue(statusKey, previousStatusValue);
			return null;
		}

		return nextStatusValue;
	};

	return {
		memoData,
		isSaving,
		saveMemo,
		handleMemoChange,
		handleImpressionChange,
		handleActionItemChange,
		updateCategory,
		toggleMemoStatus,
	};
}
