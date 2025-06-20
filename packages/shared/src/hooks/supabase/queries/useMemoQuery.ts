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

	const query = useSuspenseQuery({
		queryFn: new MemoService(supabaseClient).getMemos,
		queryKey: QUERY_KEY.memos(),
		select: ({ data: memos }) => {
			if (memos?.length === 0) return;

			if (id) return memos?.find((memo) => memo.id === id);
			if (url) return memos?.find((memo) => memo.url === normalizeUrl(url));
			return;
		},
	});

	return {
		...query,
		memo: query.data,
	};
}
