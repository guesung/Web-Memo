import {
	deleteMemo,
	getAllMemos,
	getMemoByUrl,
	toggleWishByUrl,
	upsertMemo,
} from "@/lib/storage/localMemo";
import { syncMemosToSupabase } from "@/lib/storage/syncService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const QUERY_KEY = {
	localMemos: () => ["localMemos"] as const,
	localMemoByUrl: (url: string) => ["localMemo", url] as const,
};

export function useLocalMemos() {
	return useQuery({
		queryKey: QUERY_KEY.localMemos(),
		queryFn: getAllMemos,
	});
}

export function useLocalMemoByUrl(url: string) {
	return useQuery({
		queryKey: QUERY_KEY.localMemoByUrl(url),
		queryFn: () => getMemoByUrl(url),
		enabled: !!url,
	});
}

export function useLocalMemoUpsert() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: upsertMemo,
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.localMemos() });
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.localMemoByUrl(variables.url),
			});
		},
	});
}

export function useLocalMemoWishToggle() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			url,
			title,
			favIconUrl,
		}: {
			url: string;
			title?: string;
			favIconUrl?: string;
		}) => toggleWishByUrl(url, title, favIconUrl),
		onSuccess: (_data, { url }) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.localMemos() });
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.localMemoByUrl(url),
			});
		},
	});
}

export function useLocalMemoDelete() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteMemo,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.localMemos() });
		},
	});
}

export function useSyncMemos() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: syncMemosToSupabase,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.localMemos() });
		},
	});
}
