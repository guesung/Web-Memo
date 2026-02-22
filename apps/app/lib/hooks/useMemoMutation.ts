import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MemoService } from "@web-memo/shared/utils/services";
import type { MemoTable } from "@web-memo/shared/types";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { supabase } from "@/lib/supabase/client";

const memoService = new MemoService(supabase);

export function useMemoUpsertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MemoTable["Insert"]) => {
      if (data.url) {
        const existing = await memoService.getMemoByUrl(data.url);
        if (existing.data && existing.data.length > 0) {
          return memoService.updateMemo({
            id: existing.data[0].id,
            request: data,
          });
        }
      }
      return memoService.insertMemo(data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
      if (variables.url) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY.memo({ url: variables.url }) });
      }
    },
  });
}

export function useDeleteMemoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return memoService.deleteMemo(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
    },
  });
}

export function useMemoWishToggleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      url: string;
      title: string;
      favIconUrl?: string;
      currentIsWish: boolean;
    }) => {
      const existing = await memoService.getMemoByUrl(data.url);
      if (existing.data && existing.data.length > 0) {
        return memoService.updateMemo({
          id: existing.data[0].id,
          request: { isWish: !data.currentIsWish },
        });
      }
      return memoService.insertMemo({
        url: data.url,
        title: data.title,
        memo: "",
        isWish: true,
        favIconUrl: data.favIconUrl,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.memo({ url: variables.url }) });
    },
  });
}
