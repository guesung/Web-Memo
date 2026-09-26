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
import type { TCategoryChangeSource } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type { Database } from "@web-memo/shared/types";
import { getTabInfo } from "@web-memo/shared/utils/extension";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useMemoTitleSync } from "./useMemoTitleSync";

/** 사이드 패널 하단 SaveStatus가 그리는 저장 상태. */
export type TSaveStatus = "empty" | "saved" | "slow" | "failed" | "retrying";

interface SaveMemoOptions extends Partial<MemoInput> {
	tabInfo?: { title: string; favIconUrl?: string; url: string };
	memoId?: number;
}

interface UseMemoFormProps {
	onSaveSuccess?: (memoInput: MemoInput) => void;
	selectedMemo?: Database["memo"]["Tables"]["memo"]["Row"];
}

/** 선택한 메모의 폼 값과 저장 순서를 관리한다. */
export default function useMemoForm({
	onSaveSuccess,
	selectedMemo,
}: UseMemoFormProps = {}) {
	const { setValue, getValues } = useFormContext<MemoInput>();
	const { debounce, abortDebounce } = useDebounce();
	const { debounce: debounceTitle, abortDebounce: abortTitleDebounce } =
		useDebounce();
	const { data: tab } = useTabQuery();
	const { memo: onlyMemo, refetch: refetchMemo } = useMemoQuery({
		url: tab?.url ?? "",
	});
	const memoData = selectedMemo ?? onlyMemo;
	const titleSync = useMemoTitleSync({
		onTitleUpdate: (title) => setValue("title", title),
		initialSavedTitle: memoData?.title,
		memoId: memoData?.id,
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
	// 동시 upsert를 막는 내부 큐 게이트. ref로 두는 이유는 onSuccess 안에서 대기 저장을
	// 곧바로 재실행할 때 state의 배치 지연 없이 최신 값을 즉시 읽어야 하기 때문이다.
	const isSavingRef = useRef(false);
	// "다른 메모 선택" 버튼을 막는 반응형 상태. 동시 저장을 막는 게이트 자체는 isSavingRef가 맡는다.
	const [isWritePending, setIsWritePending] = useState(false);
	const [saveStatus, setSaveStatus] = useState<TSaveStatus>("empty");
	// 저장이 1초를 넘기면 진행 중(slow) 또는 다시 시도 중(retrying) 표시로 넘어간다.
	const slowSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const initializedMemoIdRef = useRef<number | null>(null);
	const hasInitializedMemoRef = useRef(false);
	const hasEditedMemoRef = useRef(false);
	/** 입력했지만 아직 저장 요청이 나가지 않은 변경이 있는지. 전환 전 저장을 건너뛸지 판단한다. */
	const hasUnsavedChangeRef = useRef(false);
	const pendingDataRef = useRef<SaveMemoOptions | null>(null);

	useDidMount(() => {
		bridge.handle.REFETCH_THE_MEMO_LIST_FROM_WEB(refetchMemo);
		bridge.handle.REFETCH_THE_MEMO_LIST_FROM_EXTENSION(refetchMemo);
	});

	useEffect(() => {
		return () => {
			if (slowSaveTimerRef.current) {
				clearTimeout(slowSaveTimerRef.current);
			}
		};
	}, []);

	useEffect(
		function initMemoData() {
			const currentMemoId = memoData?.id ?? null;
			const isNewMemo = initializedMemoIdRef.current !== currentMemoId;
			const isFirstSaveOfEditedDraft =
				hasInitializedMemoRef.current &&
				hasEditedMemoRef.current &&
				initializedMemoIdRef.current === null &&
				currentMemoId !== null;

			// 저장이 진행 중이거나 실패해서 재시도를 기다리는 동안에는 이 화면의 memoData 변화만으로
			// 폼 값과 저장 상태를 덮지 않는다. 지금 붙들고 있는 저장의 중간 상태일 뿐이다.
			const isSavingOrRecovering =
				isSavingRef.current ||
				saveStatus === "failed" ||
				saveStatus === "retrying";

			if (isSavingOrRecovering) {
				return;
			}

			if (isNewMemo && !isFirstSaveOfEditedDraft) {
				setValue("memo", memoData?.memo ?? "");
				setValue("impression", memoData?.impression ?? "");
				setValue("actionItem", memoData?.actionItem ?? "");

				if (slowSaveTimerRef.current) {
					clearTimeout(slowSaveTimerRef.current);
					slowSaveTimerRef.current = null;
				}
				setSaveStatus(currentMemoId === null ? "empty" : "saved");
			}
			initializedMemoIdRef.current = currentMemoId;
			hasInitializedMemoRef.current = true;

			if (!isFirstSaveOfEditedDraft) {
				setValue("isWish", memoData?.isWish ?? false);
				setValue("isStar", memoData?.isStar ?? false);
				setValue("isReading", memoData?.isReading ?? false);
				setValue("categoryId", memoData?.category_id ?? null);
			}
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
			saveStatus,
			setValue,
		],
	);

	const saveMemo = useCallback(
		async (overrides?: SaveMemoOptions) => {
			// 이미 저장 중이면 이 변경은 큐에 실려 다음 저장에 함께 나간다. 그 저장의 성패는
			// 이 호출이 아니라 그때의 onError가 들고 있으므로 여기서는 실패로 보지 않는다.
			if (isSavingRef.current) {
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

			isSavingRef.current = true;
			setIsWritePending(true);
			pendingDataRef.current = null;
			hasUnsavedChangeRef.current = false;

			// 저장이 1초를 넘기면 진행 중 표시로 넘어간다. 그 전에 끝나면 성공은 조용히 지나간다.
			// 이미 실패해서 다시 시도하는 중(failed·retrying)이라면 slow로 덮지 않고 그대로 둔다.
			slowSaveTimerRef.current = setTimeout(() => {
				setSaveStatus((currentSaveStatus) =>
					currentSaveStatus === "failed" || currentSaveStatus === "retrying"
						? "retrying"
						: "slow",
				);
			}, 1000);

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
							if (slowSaveTimerRef.current) {
								clearTimeout(slowSaveTimerRef.current);
								slowSaveTimerRef.current = null;
							}
							isSavingRef.current = false;
							setIsWritePending(false);
							setSaveStatus("saved");
							if (pendingDataRef.current !== null) {
								const pendingData = pendingDataRef.current;
								pendingDataRef.current = null;
								void saveMemo(pendingData);
							}
							onSaveSuccess?.(memoInput);
							resolveIsSaved(true);
						},
						onError: () => {
							// 실패 토스트와 Sentry 보고는 QueryProvider의 MutationCache가 이미 맡는다.
							// 여기서는 저장 상태만 되돌리고, 성패는 호출부가 UI 분기에 쓰도록 넘긴다.
							if (slowSaveTimerRef.current) {
								clearTimeout(slowSaveTimerRef.current);
								slowSaveTimerRef.current = null;
							}
							isSavingRef.current = false;
							setIsWritePending(false);
							setSaveStatus("failed");
							pendingDataRef.current = null;
							hasUnsavedChangeRef.current = true;
							resolveIsSaved(false);
						},
					},
				);
			});
		},
		[getValues, memoData?.id, upsertMemo, onSaveSuccess],
	);

	/**
	 * 실패한 저장을 다시 시도한다.
	 * @description 자동 저장이 1초를 넘겨 실패로 이어지는 것과 달리, 사용자가 직접 누른 시도는
	 * 기다리지 않고 곧바로 다시 시도 중 표시로 넘어간다.
	 */
	const handleSaveRetryClick = () => {
		setSaveStatus("retrying");
		void saveMemo();
	};

	const handleTitleChange = (text: string) => {
		hasEditedMemoRef.current = true;
		hasUnsavedChangeRef.current = true;
		titleSync.handleTitleInputChange(text);
		debounceTitle(() => saveMemo({ title: text }));
	};

	const handleMemoChange = useCallback(
		(text: string) => {
			hasEditedMemoRef.current = true;
			hasUnsavedChangeRef.current = true;
			setValue("memo", text);
			debounce(() => saveMemo({ memo: text }));
		},
		[setValue, debounce, saveMemo],
	);

	const handleImpressionChange = useCallback(
		(text: string) => {
			hasEditedMemoRef.current = true;
			hasUnsavedChangeRef.current = true;
			setValue("impression", text);
			debounce(() => saveMemo({ impression: text }));
		},
		[setValue, debounce, saveMemo],
	);

	const handleActionItemChange = useCallback(
		(text: string) => {
			hasEditedMemoRef.current = true;
			hasUnsavedChangeRef.current = true;
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
		hasEditedMemoRef.current = true;
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
		hasEditedMemoRef.current = true;
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

	const saveBeforeSwitch = async () => {
		if (isSavingRef.current) {
			return false;
		}
		// 바뀐 내용이 없으면 저장 왕복 없이 바로 넘어간다. 아무것도 쓰지 않은 새 메모가 빈 행으로 저장되는 것도 막는다.
		if (!hasUnsavedChangeRef.current) {
			return true;
		}

		abortDebounce();
		abortTitleDebounce();

		return saveMemo();
	};

	return {
		memoData,
		/** 저장 중인 편집 대상을 바꾸지 않기 위한 내부 상태. */
		isWritePending,
		saveBeforeSwitch,
		/** 하단 바 SaveStatus가 그릴 저장 상태 */
		saveStatus,
		handleSaveRetryClick,
		saveMemo,
		handleTitleChange,
		handleMemoChange,
		handleImpressionChange,
		handleActionItemChange,
		updateCategory,
		toggleMemoStatus,
	};
}
