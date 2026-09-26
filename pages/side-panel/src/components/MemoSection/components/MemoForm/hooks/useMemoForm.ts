import type { MemoInput } from "@src/types/Input";
import { useQuery } from "@tanstack/react-query";
import type { TMemoStatusKey } from "@web-memo/shared/constants";
import {
	memoQueryOptions,
	useDebounce,
	useDidMount,
	useMemoPatchMutation,
	useMemoUpsertMutation,
	useSupabaseClientQuery,
	useTabQuery,
} from "@web-memo/shared/hooks";
import type { TCategoryChangeSource } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { getTabInfo } from "@web-memo/shared/utils/extension";
import { normalizeUrl } from "@web-memo/shared/utils/url";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useMemoTitleSync } from "./useMemoTitleSync";

interface SaveMemoOptions extends Partial<MemoInput> {
	tabInfo?: { title: string; favIconUrl?: string; url: string };
	memoId?: number;
	/**
	 * 저장 표시("저장 중...")를 띄우지 않고 조용히 저장한다.
	 * @description 제목처럼 계속 타이핑하는 필드가 아닌 변경에 쓴다. 동시 저장을 막는
	 * 내부 큐(isSaving)는 그대로 타므로 저장 순서는 달라지지 않는다.
	 */
	isSilent?: boolean;
}

interface UseMemoFormProps {
	onSaveSuccess?: (memoInput: MemoInput) => void;
}

export default function useMemoForm({ onSaveSuccess }: UseMemoFormProps = {}) {
	const { setValue, getValues } = useFormContext<MemoInput>();
	const { debounce } = useDebounce();
	const { debounce: debounceTitle, abortDebounce: abortTitleDebounce } =
		useDebounce();
	const { data: tab } = useTabQuery();
	const { data: supabaseClient } = useSupabaseClientQuery();
	const normalizedUrl = tab?.url ? normalizeUrl(tab.url) : null;
	const {
		data: memoQueryData,
		isPending: isMemoPending,
		isError: isMemoQueryError,
		refetch: refetchMemo,
	} = useQuery({
		...memoQueryOptions({ supabaseClient, url: tab?.url }),
		// MemoSection이 같은 키를 이미 prefetch했으므로 마운트 때 한 번 더 조회하지 않는다.
		refetchOnMount: false,
	});
	const memoData = memoQueryData?.data?.at(-1);
	// supabase-js는 5xx·네트워크 오류에도 throw하지 않고 `{ data: null, error }`를 돌려준다.
	// 쿼리는 성공으로 끝나므로 응답의 error도 실패로 본다. throw된 오류는 캐시 데이터가 있으면 잠그지 않는다.
	const isMemoError =
		Boolean(memoQueryData?.error) || (isMemoQueryError && !memoQueryData);
	const isMemoLocked = isMemoPending || isMemoError;
	const titleSync = useMemoTitleSync({
		onTitleUpdate: (title) => setValue("title", title),
		initialSavedTitle: memoData?.title,
		memoId: memoData?.id,
		isMemoResolved: !isMemoLocked,
		pageUrl: tab?.url,
		pageTitle: tab?.title,
	});
	const titlePageRef = useRef("");
	useEffect(() => {
		const pageKey = `${tab?.id}:${tab?.url}`;
		if (titlePageRef.current !== pageKey) {
			abortTitleDebounce();
			titlePageRef.current = pageKey;
		}
	}, [tab?.id, tab?.url, abortTitleDebounce]);
	const { mutate: upsertMemo } = useMemoUpsertMutation();
	const { mutate: patchMemo } = useMemoPatchMutation();
	// isSaving은 동시 upsert를 막는 내부 큐용이고, 화면에 보여줄지는 따로 판단한다.
	// 둘을 하나로 합치면 조용한 저장이 큐를 건너뛰어 저장이 서로 덮어쓴다.
	const [isSaving, setIsSaving] = useState(false);
	const [isSaveStatusVisible, setIsSaveStatusVisible] = useState(false);
	// URL과 메모 id를 함께 키로 삼는다. id만 보면 메모가 없는 URL끼리 옮겨도(둘 다 null)
	// "같은 메모"로 오판해 리셋을 건너뛴다.
	const initializedMemoKeyRef = useRef<string | null>(null);
	const pendingDataRef = useRef<SaveMemoOptions | null>(null);

	useDidMount(() => {
		bridge.handle.REFETCH_THE_MEMO_LIST_FROM_WEB(refetchMemo);
		bridge.handle.REFETCH_THE_MEMO_LIST_FROM_EXTENSION(refetchMemo);
	});

	useEffect(
		function initMemoData() {
			const currentMemoKey = `${normalizedUrl ?? ""}:${memoData?.id ?? "none"}`;
			const isNewMemo = initializedMemoKeyRef.current !== currentMemoKey;

			if (isNewMemo) {
				setValue("memo", memoData?.memo ?? "");
				setValue("impression", memoData?.impression ?? "");
				setValue("actionItem", memoData?.actionItem ?? "");
				initializedMemoKeyRef.current = currentMemoKey;
			}

			setValue("isWish", memoData?.isWish ?? false);
			setValue("isStar", memoData?.isStar ?? false);
			setValue("isReading", memoData?.isReading ?? false);
			setValue("categoryId", memoData?.category_id ?? null);
		},
		[
			normalizedUrl,
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
			// 메모 조회가 끝나지 않았으면 무엇을 덮어쓸지 알 수 없다. 저장 요청 자체를 보내지 않는다.
			if (isMemoLocked) {
				return false;
			}

			// 이미 저장 중이면 이 변경은 큐에 실려 다음 저장에 함께 나간다. 그 저장의 성패는
			// 이 호출이 아니라 그때의 onError가 들고 있으므로 여기서는 실패로 보지 않는다.
			if (isSaving) {
				pendingDataRef.current = overrides ?? null;
				return true;
			}

			const currentValues = getValues();
			const memoInput: MemoInput = {
				title: overrides?.title ?? currentValues.title,
				memo: overrides?.memo ?? currentValues.memo,
				impression: overrides?.impression ?? currentValues.impression,
				actionItem: overrides?.actionItem ?? currentValues.actionItem,
				isWish: overrides?.isWish ?? currentValues.isWish,
				isStar: overrides?.isStar ?? currentValues.isStar,
				isReading: overrides?.isReading ?? currentValues.isReading,
				categoryId: overrides?.categoryId ?? currentValues.categoryId,
			};

			setIsSaving(true);
			if (!overrides?.isSilent) {
				setIsSaveStatusVisible(true);
			}

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
							// 사용자가 고친 제목이 탭 제목보다 우선이다. 비어 있을 때만 탭 제목으로 되돌린다.
							title: memoInput.title.trim() || tabInfo.title,
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
								setIsSaveStatusVisible(false);
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
							setIsSaveStatusVisible(false);
							pendingDataRef.current = null;
							resolveIsSaved(false);
						},
					},
				);
			});
		},
		[
			isMemoLocked,
			isSaving,
			getValues,
			memoData?.id,
			upsertMemo,
			onSaveSuccess,
		],
	);

	const handleTitleChange = (text: string) => {
		titleSync.handleTitleInputChange(text);
		debounceTitle(() => saveMemo({ title: text, isSilent: true }));
	};

	const handleTitleSyncClick = async () => {
		if (isMemoLocked) {
			return;
		}

		abortTitleDebounce();
		const currentTab = await titleSync.handleTitleSyncClick();
		if (
			!currentTab ||
			currentTab.id !== tab?.id ||
			currentTab.url !== tab?.url
		) {
			return;
		}

		await saveMemo({
			title: currentTab.title,
			tabInfo: {
				title: currentTab.title ?? "",
				url: currentTab.url ?? "",
				favIconUrl: currentTab.favIconUrl,
			},
			isSilent: true,
		});
	};

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

	/**
	 * 메모 카테고리를 바꾼다.
	 * @description 저장된 메모는 바로 patch하고, 실패하면 폼 값을 이전 카테고리로 되돌린다.
	 * 실패 알림은 QueryProvider의 MutationCache가 맡는다. 저장 전 메모는 폼 값만 바꾸고
	 * 첫 저장 때 함께 저장되므로 변경 이벤트도 따로 보내지 않는다.
	 */
	const updateCategory = (
		categoryId: number | null,
		source: TCategoryChangeSource,
	) => {
		if (isMemoLocked) {
			return;
		}

		const previousCategoryId = getValues("categoryId");
		setValue("categoryId", categoryId);

		if (!memoData?.id) {
			return;
		}

		patchMemo(
			{
				id: memoData.id,
				request: { category_id: categoryId },
				categorySource: source,
			},
			{
				onError: () => {
					// 응답을 기다리는 사이 다른 카테고리를 골랐다면 그 선택을 덮지 않는다.
					const isStillRequestedCategory =
						getValues("categoryId") === categoryId;

					if (isStillRequestedCategory) {
						setValue("categoryId", previousCategoryId);
					}
				},
			},
		);
	};

	/**
	 * 메모 상태 하나를 반전시켜 저장한다.
	 * @description 저장에 실패하면 낙관적으로 바꿔둔 폼 값을 되돌리고 `null`을 준다.
	 * 호출부는 이 `null`로 성공 토스트를 건너뛴다. 실패 알림 자체는 QueryProvider의 MutationCache가 맡는다.
	 */
	const toggleMemoStatus = async (statusKey: TMemoStatusKey) => {
		if (isMemoLocked) {
			return null;
		}

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
		/** 메모 조회가 아직 없거나(대기) 캐시 없이 실패한 상태. 켜져 있으면 편집·저장을 막는다. */
		isMemoLocked,
		/** 캐시 없이 조회가 실패했는지. 다시 시도 UI를 보여줄 때 쓴다. */
		isMemoError,
		refetchMemo,
		/** 저장 표시용. 제목처럼 조용히 저장하는 변경(isSilent)에는 켜지지 않는다. */
		isSaving: isSaveStatusVisible,
		saveMemo,
		handleTitleChange,
		handleTitleSyncClick,
		isTitleSyncAvailable: titleSync.isTitleSyncAvailable,
		handleMemoChange,
		handleImpressionChange,
		handleActionItemChange,
		updateCategory,
		toggleMemoStatus,
	};
}
