import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { MemoRow, MemoTable } from "@web-memo/shared/types";
import { getPageKey } from "@web-memo/shared/utils/url";
import { memoService } from "@/lib/supabase/client";

/** 페이지 후보 중 명시적으로 선택된 메모 또는 유일한 메모를 반환한다. */
const getTargetMemo = async (url: string, selectedId?: number) => {
	const result = await memoService.getMemoByUrl(url);
	if (result.error) {
		throw result.error;
	}
	const candidates = result.data ?? [];
	if (selectedId === undefined && candidates.length > 1) {
		throw new Error("수정할 메모를 선택해 주세요.");
	}
	const target =
		selectedId === undefined
			? candidates[0]
			: candidates.find((candidate) => candidate.id === selectedId);
	if (selectedId !== undefined && !target) {
		throw new Error("선택한 메모가 현재 페이지에 속하지 않습니다.");
	}

	return target;
};

const invalidateMemoPage = (
	queryClient: ReturnType<typeof useQueryClient>,
	url: string,
) => {
	queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
	queryClient.invalidateQueries({
		queryKey: QUERY_KEY.memo({ url: getPageKey(url) }),
	});
};

/** 선택한 메모만 수정하고, 새 메모는 원본 URL로 저장한다. */
export function useMemoUpsertMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			data: MemoTable["Insert"] & {
				selectedId?: number;
				createSeparate?: boolean;
			},
		) => {
			const { selectedId, createSeparate, ...request } = data;
			const existing = createSeparate
				? undefined
				: await getTargetMemo(data.url, selectedId);
			const result = existing
				? await memoService.updateMemo({
						id: existing.id,
						request: {
							...request,
							url: existing.url,
							isWish: data.isWish ?? existing.isWish,
							isStar: data.isStar ?? existing.isStar,
							isReading: data.isReading ?? existing.isReading,
						},
					})
				: await memoService.insertMemo(request);
			if (result.error) {
				throw result.error;
			}
			if (
				!result.data?.[0] ||
				(existing && result.data[0].id !== existing.id)
			) {
				throw new Error("메모 저장 결과를 확인하지 못했습니다.");
			}

			return result;
		},
		onSuccess: (_data, variables) =>
			invalidateMemoPage(queryClient, variables.url),
	});
}

/** 선택한 메모를 휴지통으로 보낸다. */
export function useDeleteMemoMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number) => memoService.deleteMemo(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
			queryClient.invalidateQueries({ queryKey: ["memo"] });
		},
	});
}

/** 페이지 상태 토글 입력. */
interface IFMemoToggleData {
	url: string;
	title: string;
	favIconUrl?: string;
	selectedId?: MemoRow["id"];
}

const toggleMemoFlag = async (
	data: IFMemoToggleData,
	flag: "isWish" | "isReading" | "isStar",
) => {
	const existing = await getTargetMemo(data.url, data.selectedId);
	const result = existing
		? await memoService.updateMemo({
				id: existing.id,
				request: { [flag]: !existing[flag] },
			})
		: await memoService.insertMemo({
				url: data.url,
				title: data.title,
				memo: "",
				favIconUrl: data.favIconUrl,
				[flag]: true,
			});
	if (result.error) {
		throw result.error;
	}
	if (!result.data?.[0] || (existing && result.data[0].id !== existing.id)) {
		throw new Error("메모 상태 변경 결과를 확인하지 못했습니다.");
	}

	return result;
};

/** 선택한 메모의 위시 상태를 전환한다. */
export function useMemoWishToggleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: IFMemoToggleData & { currentIsWish: boolean }) =>
			toggleMemoFlag(data, "isWish"),
		onSuccess: (_data, variables) =>
			invalidateMemoPage(queryClient, variables.url),
	});
}

/** 선택한 메모의 읽는 중 상태를 전환한다. */
export function useMemoReadingToggleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: IFMemoToggleData & { currentIsReading: boolean }) =>
			toggleMemoFlag(data, "isReading"),
		onSuccess: (_data, variables) =>
			invalidateMemoPage(queryClient, variables.url),
	});
}

/** 선택한 메모의 중요 상태를 전환한다. */
export function useMemoStarToggleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: IFMemoToggleData & { currentIsStar: boolean }) =>
			toggleMemoFlag(data, "isStar"),
		onSuccess: (_data, variables) =>
			invalidateMemoPage(queryClient, variables.url),
	});
}
