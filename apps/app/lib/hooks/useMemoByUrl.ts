import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { memoService } from "@/lib/supabase/client";

export function useSupabaseMemoByUrl(url: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEY.memo({ url }),
    queryFn: async () => {
      const result = await memoService.getMemoByUrl(url);
      return result.data?.[0] ?? null;
    },
    enabled: !!url && enabled,
  });
}
