import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPageKey } from "@web-memo/shared/utils/url";
import { buildMemoWriteFields } from "@/lib/analytics/analyticsCore";
import { trackAppEvent } from "@/lib/analytics/appAnalytics";
import {
	deleteMemo,
	getAllMemos,
	getMemoByUrl,
	toggleReadingByUrl,
	toggleStarByUrl,
	toggleWishByUrl,
	upsertMemoWithExisting,
} from "@/lib/storage/localMemo";
import { syncMemosToSupabase } from "@/lib/storage/syncService";

const QUERY_KEY = {
	localMemos: () => ["localMemos"] as const,
	localMemoByUrl: (url: string) =>
		["localMemo", url ? getPageKey(url) : ""] as const,
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
		mutationFn: async (
			params: Parameters<typeof upsertMemoWithExisting>[0],
		) => {
			const { memo, isExisting } = await upsertMemoWithExisting(params);

			return { ...memo, isExisting };
		},
		onSuccess: (data, variables) => {
			if (data.isExisting) {
				void trackAppEvent({
					name: "memo_write",
					params: { fields: buildMemoWriteFields(variables) },
				});
			} else {
				void trackAppEvent({ name: "memo_first_write" });
			}
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
			selectedId,
		}: {
			url: string;
			title?: string;
			favIconUrl?: string;
			selectedId?: string;
		}) => toggleWishByUrl(url, title, favIconUrl, selectedId),
		onSuccess: (data, { url }) => {
			void trackAppEvent({
				name: "memo_status_toggle",
				params: { status: "wish", enabled: Boolean(data.isWish) },
			});
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.localMemos() });
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.localMemoByUrl(url),
			});
		},
	});
}

export function useLocalMemoStarToggle() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			url,
			title,
			favIconUrl,
			selectedId,
		}: {
			url: string;
			title?: string;
			favIconUrl?: string;
			selectedId?: string;
		}) => toggleStarByUrl(url, title, favIconUrl, selectedId),
		onSuccess: (data, { url }) => {
			void trackAppEvent({
				name: "memo_status_toggle",
				params: { status: "star", enabled: Boolean(data.isStar) },
			});
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.localMemos() });
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.localMemoByUrl(url),
			});
		},
	});
}

export function useLocalMemoReadingToggle() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			url,
			title,
			favIconUrl,
			selectedId,
		}: {
			url: string;
			title?: string;
			favIconUrl?: string;
			selectedId?: string;
		}) => toggleReadingByUrl(url, title, favIconUrl, selectedId),
		onSuccess: (data, { url }) => {
			void trackAppEvent({
				name: "memo_status_toggle",
				params: { status: "reading", enabled: Boolean(data.isReading) },
			});
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
			queryClient.invalidateQueries({ queryKey: ["localMemo"] });
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
