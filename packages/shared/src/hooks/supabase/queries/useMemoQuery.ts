import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { MemoService, normalizeUrl } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

interface UseMemoQueryProps {
	url?: string;
	id?: number;
}

export default function useMemoQuery({ url, id }: UseMemoQueryProps) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const memoService = new MemoService(supabaseClient);

	const normalizedUrl = url ? normalizeUrl(url) : undefined;

	const query = useSuspenseQuery({
		queryFn: async () => {
			if (id) return memoService.getMemoById(id);
			if (normalizedUrl) return memoService.getMemoByUrl(normalizedUrl);
			return { data: [], error: null };
		},
		queryKey: QUERY_KEY.memo({ url: normalizedUrl, id }),
	});

	return {
		...query,
		memo: query.data?.data?.at(-1),
	};
}
