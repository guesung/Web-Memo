import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { getPageKey } from "@web-memo/shared/utils/url";
import { useAuth } from "@/lib/auth/AuthProvider";
import { memoService } from "@/lib/supabase/client";

export function useSupabaseMemoByUrl(url: string, enabled = true) {
	const { session, isLoading } = useAuth();
	return useQuery({
		queryKey: [
			...QUERY_KEY.memo({ url: url ? getPageKey(url) : undefined }),
			session?.user.id ?? "guest",
		],
		queryFn: async () => {
			const result = await memoService.getMemoByUrl(url);
			if (result.error) {
				throw result.error;
			}

			return result.data ?? [];
		},
		enabled: !!url && enabled && !isLoading && !!session,
	});
}
