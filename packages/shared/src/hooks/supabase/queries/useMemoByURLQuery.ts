import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { MemoService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

interface UseMemoByURLQueryProps {
	url?: string;
}

export default function useMemoByURLQuery({ url }: UseMemoByURLQueryProps) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryFn: () => new MemoService(supabaseClient).getMemoByUrl(url ?? ""),
		queryKey: QUERY_KEY.memoByUrl(url ?? ""),
	});

	return {
		...query,
		memo: query.data?.data,
	};
}
