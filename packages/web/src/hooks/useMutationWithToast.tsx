import { useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { toast, ToastAction } from "@web-memo/ui";

/**
 * Mutation 성공 시 Toast를 표시하는 옵션
 */
interface ToastOptions {
	title: string;
	description?: string;
	action?: {
		label: string;
		altText: string;
		onClick: () => void;
	};
}

/**
 * 간단한 성공 Toast 콜백을 생성하는 헬퍼
 *
 * @example
 * ```typescript
 * const { mutate: insertCategory } = useCategoryPostMutation();
 * const showSuccessToast = useSuccessToast(t("toastTitle.successSave"));
 *
 * // 사용
 * insertCategory(data, { onSuccess: showSuccessToast });
 * ```
 */
export function useSuccessToast(title: string, description?: string) {
	return () => {
		toast({ title, description });
	};
}

/**
 * Mutation에 Toast 기능을 추가하는 헬퍼
 *
 * @example
 * ```typescript
 * const { mutate } = useCategoryPostMutation();
 *
 * const mutateWithToast = useMutationWithToast(mutate, {
 *   title: t("toastTitle.successSave"),
 * });
 *
 * mutateWithToast(categoryData);
 * ```
 */
export function useMutationWithToast<TData = unknown, TVariables = void>(
	mutateFn: (
		variables: TVariables,
		options?: UseMutationOptions<TData, Error, TVariables>,
	) => void,
	toastOptions: ToastOptions,
	queryKeysToInvalidate?: string[][],
) {
	const queryClient = useQueryClient();

	return (variables: TVariables) => {
		mutateFn(variables, {
			onSuccess: () => {
				// Toast 표시
				toast({
					title: toastOptions.title,
					description: toastOptions.description,
					action: toastOptions.action ? (
						<ToastAction
							altText={toastOptions.action.altText}
							onClick={toastOptions.action.onClick}
						>
							{toastOptions.action.label}
						</ToastAction>
					) : undefined,
				});

				// Query 무효화
				if (queryKeysToInvalidate) {
					for (const queryKey of queryKeysToInvalidate) {
						queryClient.invalidateQueries({ queryKey });
					}
				}
			},
		});
	};
}

/**
 * Undo 기능이 있는 Mutation Toast 헬퍼
 *
 * 주로 삭제/변경 작업에 사용되며, Undo 액션으로 이전 상태를 복원할 수 있습니다.
 *
 * @example
 * ```typescript
 * const { mutate: deleteMemo } = useDeleteMemosMutation();
 * const { mutate: upsertMemo } = useMemosUpsertMutation();
 *
 * const handleDelete = useMutationWithUndo({
 *   mutateFn: deleteMemo,
 *   undoFn: upsertMemo,
 *   toastTitle: t("toastTitle.memoDeleted"),
 *   undoLabel: t("toastActionMessage.undo"),
 *   queryKeysToInvalidate: [QUERY_KEY.memos()],
 * });
 *
 * handleDelete(memoIds, previousMemoData);
 * ```
 */
export function useMutationWithUndo<TDeleteData, TRestoreData = TDeleteData>() {
	const queryClient = useQueryClient();

	return ({
		mutateFn,
		undoFn,
		toastTitle,
		toastDescription,
		undoLabel,
		undoAltText,
		queryKeysToInvalidate,
	}: {
		mutateFn: (
			variables: TDeleteData,
			options?: UseMutationOptions<unknown, Error, TDeleteData>,
		) => void;
		undoFn: (
			variables: TRestoreData,
			options?: UseMutationOptions<unknown, Error, TRestoreData>,
		) => void;
		toastTitle: string;
		toastDescription?: string;
		undoLabel: string;
		undoAltText?: string;
		queryKeysToInvalidate?: string[][];
	}) => {
		return (deleteData: TDeleteData, restoreData: TRestoreData) => {
			// 삭제 실행
			mutateFn(deleteData);

			// Undo 핸들러
			const handleUndo = () => {
				undoFn(restoreData);

				// Query 무효화
				if (queryKeysToInvalidate) {
					for (const queryKey of queryKeysToInvalidate) {
						queryClient.invalidateQueries({ queryKey });
					}
				}
			};

			// Toast 표시
			toast({
				title: toastTitle,
				description: toastDescription,
				action: (
					<ToastAction altText={undoAltText || undoLabel} onClick={handleUndo}>
						{undoLabel}
					</ToastAction>
				),
			});
		};
	};
}
