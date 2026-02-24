import { useQuery } from "@tanstack/react-query";
import { MemoService } from "@web-memo/shared/utils/services";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { supabase } from "@/lib/supabase/client";

const memoService = new MemoService(supabase);

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
